import React, { useEffect, useRef, useState } from 'react';
import { LocationData, GeofenceZone } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Navigation, 
  Volume2, 
  ShieldAlert, 
  Plus, 
  Compass, 
  Battery, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Footprints,
  Trash2,
  X,
  AlertTriangle,
  RefreshCw,
  Zap,
  Radio
} from 'lucide-react';

interface LocationMapViewProps {
  location: LocationData;
  locationHistory: LocationData[];
  geofences: GeofenceZone[];
  batteryLevel: number;
  childName: string;
  onUpdateLocation: (lat: number, lng: number, address: string) => void;
  onAddGeofence?: (name: string, lat: number, lng: number, radiusMeters: number, type: 'safe' | 'restricted') => void;
  onDeleteGeofence?: (id: string) => void;
  onTriggerSiren: () => void;
}

export const LocationMapView: React.FC<LocationMapViewProps> = ({
  location,
  locationHistory = [],
  geofences = [],
  batteryLevel,
  childName,
  onUpdateLocation,
  onAddGeofence,
  onDeleteGeofence,
  onTriggerSiren
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const pathLineRef = useRef<L.Polyline | null>(null);
  const circlesRef = useRef<L.Circle[]>([]);

  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [newFenceName, setNewFenceName] = useState('');
  const [newFenceType, setNewFenceType] = useState<'safe' | 'restricted'>('safe');
  const [newFenceRadius, setNewFenceRadius] = useState(350);
  const [newFenceLat, setNewFenceLat] = useState(location.lat || 23.8103);
  const [newFenceLng, setNewFenceLng] = useState(location.lng || 90.4125);

  const hasRealGps = location.lat && (location.lat !== 23.8103 || !location.address?.includes("Waiting"));

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const lat = location.lat || 23.8103;
    const lng = location.lng || 90.4125;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        setNewFenceLat(e.latlng.lat);
        setNewFenceLng(e.latlng.lng);
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.8 });
    }

    const map = mapInstanceRef.current;

    // Custom child marker icon with animated ping
    const childIcon = L.divIcon({
      className: 'custom-child-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-75"></span>
          <div class="relative w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: childIcon }).addTo(map);
    }

    // Popup content with live speed & accuracy
    const popupHtml = `
      <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 180px;">
        <b style="font-size: 13px; color: #0f172a;">📱 ${childName}</b>
        <p style="font-size: 11px; color: #475569; margin: 4px 0 6px 0;">${location.address}</p>
        <div style="display: flex; gap: 8px; font-size: 10px; font-family: monospace; color: #059669; font-weight: bold;">
          <span>⚡ ${location.speed || 0} km/h</span>
          <span>🎯 ±${location.accuracy || 5}m</span>
        </div>
      </div>
    `;
    markerRef.current.bindPopup(popupHtml);

    // Accuracy Circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([lat, lng]);
      accuracyCircleRef.current.setRadius(location.accuracy || 15);
    } else {
      accuracyCircleRef.current = L.circle([lat, lng], {
        radius: location.accuracy || 15,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.1,
        weight: 1.5
      }).addTo(map);
    }

    // Live Breadcrumb Trail Polyline
    if (locationHistory.length > 1) {
      const latLngs: [number, number][] = locationHistory.map(h => [h.lat, h.lng]);
      if (pathLineRef.current) {
        pathLineRef.current.setLatLngs(latLngs);
      } else {
        pathLineRef.current = L.polyline(latLngs, {
          color: '#f97316',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.7
        }).addTo(map);
      }
    }

    // Render Geofence Circles
    circlesRef.current.forEach(c => c.remove());
    circlesRef.current = [];

    geofences.forEach(gf => {
      const circle = L.circle([gf.lat, gf.lng], {
        color: gf.type === 'safe' ? '#10b981' : '#ef4444',
        fillColor: gf.type === 'safe' ? '#10b981' : '#ef4444',
        fillOpacity: 0.15,
        radius: gf.radiusMeters
      }).addTo(map);

      circle.bindTooltip(`<b>${gf.name}</b> (${gf.type.toUpperCase()}) - ${gf.radiusMeters}m`, { permanent: false });
      circlesRef.current.push(circle);
    });

  }, [location, locationHistory, geofences, childName]);

  // Audible Siren Synthesizer
  const playSirenSynthesizer = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.5);
      osc.frequency.linearRampToValueAtTime(600, now + 1.0);
      osc.frequency.linearRampToValueAtTime(1200, now + 1.5);
      osc.frequency.linearRampToValueAtTime(600, now + 2.0);
      osc.frequency.linearRampToValueAtTime(1200, now + 2.5);
      osc.frequency.linearRampToValueAtTime(600, now + 3.0);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 3.0);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 3.0);
    } catch (e) {}
  };

  const handleSiren = () => {
    setSirenPlaying(true);
    playSirenSynthesizer();
    onTriggerSiren();
    setTimeout(() => setSirenPlaying(false), 3000);
  };

  const handleCreateGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFenceName.trim()) return;
    if (onAddGeofence) {
      onAddGeofence(newFenceName.trim(), newFenceLat, newFenceLng, newFenceRadius, newFenceType);
    }
    setNewFenceName('');
    setShowGeofenceModal(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* Main Map Card (2 cols) */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[520px]">
        
        {/* Map Header Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Real-Time Hardware GPS Tracking
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  hasRealGps 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  {hasRealGps ? '● 24/7 LIVE GPS' : 'WAITING FOR SIGNAL'}
                </span>
              </h2>
              <p className="text-xs text-slate-600 truncate max-w-md mt-0.5">
                {location.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => mapInstanceRef.current?.setView([location.lat, location.lng], 17, { animate: true })}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Compass className="w-3.5 h-3.5 text-orange-500" />
              Recenter Map
            </button>
            <button
              onClick={() => setShowGeofenceModal(true)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Safe Zone
            </button>
          </div>
        </div>

        {/* Live GPS Telemetry Header Bar */}
        <div className="bg-slate-900 text-white px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3 border-b border-slate-800 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>LAT: {location.lat?.toFixed(5) || '...'}, LNG: {location.lng?.toFixed(5) || '...'}</span>
            </span>
            <span className="text-slate-300">
              SPEED: <b className="text-white">{location.speed || 0} km/h</b>
            </span>
            <span className="text-slate-300">
              ACCURACY: <b className="text-white">±{location.accuracy || 5}m</b>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Clock className="w-3 h-3" />
            <span>Updated: {new Date(location.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Interactive Map View */}
        <div className="relative flex-1 min-h-[440px] bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

          {/* Quick Siren Panic Trigger on Map */}
          <div className="absolute bottom-4 left-4 z-20">
            <button
              onClick={handleSiren}
              disabled={sirenPlaying}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                sirenPlaying
                  ? 'bg-red-600 text-white animate-bounce'
                  : 'bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-700 backdrop-blur-md'
              }`}
            >
              <Volume2 className="w-4 h-4 text-red-400" />
              <span>{sirenPlaying ? 'RINGING PHONE SIREN...' : 'Play Audible Alarm'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Right Column: Safe Zones & Movement Log (1 col) */}
      <div className="space-y-6">
        
        {/* Geofences / Safe Zones List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
              Geofence Safe & Restricted Zones
            </h3>
            <span className="text-xs font-mono text-slate-500">{geofences.length} Zones</span>
          </div>

          <div className="space-y-2.5">
            {geofences.length > 0 ? (
              geofences.map(gf => (
                <div 
                  key={gf.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${gf.type === 'safe' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div>
                      <b className="text-xs text-slate-900 block">{gf.name}</b>
                      <span className="text-[10px] text-slate-500 font-mono">Radius: {gf.radiusMeters}m • {gf.type.toUpperCase()}</span>
                    </div>
                  </div>
                  {onDeleteGeofence && (
                    <button
                      onClick={() => onDeleteGeofence(gf.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete Zone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No custom geofences created yet. Click <b>Add Safe Zone</b> above to set boundaries.
              </div>
            )}
          </div>
        </div>

        {/* Location History Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Footprints className="w-4 h-4 text-orange-600" />
              Recent Movement History
            </h3>
            <span className="text-xs font-mono text-slate-500">{locationHistory.length} Entries</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {locationHistory.length > 0 ? (
              locationHistory.slice(0, 8).map((hist, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 line-clamp-1">{hist.address || `GPS (${hist.lat.toFixed(4)}, ${hist.lng.toFixed(4)})`}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Speed: {hist.speed || 0} km/h
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ±{hist.accuracy || 10}m
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No past location history recorded yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Geofence Modal */}
      {showGeofenceModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Geofence Zone</h3>
              <button onClick={() => setShowGeofenceModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Zone Name</label>
                <input 
                  type="text" 
                  value={newFenceName}
                  onChange={(e) => setNewFenceName(e.target.value)}
                  placeholder="e.g. Home, School, Park" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-orange-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Zone Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFenceType('safe')}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      newFenceType === 'safe'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Safe Zone
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFenceType('restricted')}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      newFenceType === 'restricted'
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Restricted Zone
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Radius (Meters): {newFenceRadius}m</label>
                <input 
                  type="range" 
                  min="100" 
                  max="2000" 
                  step="50"
                  value={newFenceRadius}
                  onChange={(e) => setNewFenceRadius(Number(e.target.value))}
                  className="w-full accent-orange-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
