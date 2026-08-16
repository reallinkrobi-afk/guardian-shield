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
  AlertTriangle
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
  locationHistory,
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
  const circlesRef = useRef<L.Circle[]>([]);

  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [newFenceName, setNewFenceName] = useState('');
  const [newFenceType, setNewFenceType] = useState<'safe' | 'restricted'>('safe');
  const [newFenceRadius, setNewFenceRadius] = useState(350);
  const [newFenceLat, setNewFenceLat] = useState(location.lat || 23.8103);
  const [newFenceLng, setNewFenceLng] = useState(location.lng || 90.4125);

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [location.lat || 23.8103, location.lng || 90.4125],
        zoom: 15,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Map click handler to select coordinates for geofences
      map.on('click', (e: L.LeafletMouseEvent) => {
        setNewFenceLat(e.latlng.lat);
        setNewFenceLng(e.latlng.lng);
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([location.lat, location.lng], mapInstanceRef.current.getZoom());
    }

    const map = mapInstanceRef.current;

    // Custom child marker icon
    const childIcon = L.divIcon({
      className: 'custom-child-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-75"></span>
          <div class="relative w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng]);
    } else {
      markerRef.current = L.marker([location.lat, location.lng], { icon: childIcon }).addTo(map);
    }

    markerRef.current.bindPopup(`<b>${childName} is here</b><br>${location.address}`).openPopup();

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

  }, [location, geofences, childName]);

  // Real Audible Siren Synthesizer using Web Audio API
  const playSirenSynthesizer = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      
      // Siren frequency modulation (sweep between 600Hz and 1200Hz)
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
    } catch (e) {
      console.warn("Web audio siren not permitted:", e);
    }
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
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[500px]">
        
        {/* Map Header Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Real-Time GPS Location Tracking
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  Live Feed
                </span>
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {location.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => mapInstanceRef.current?.setView([location.lat, location.lng], 16)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Compass className="w-3.5 h-3.5 text-orange-500" />
              Recenter
            </button>
            <button
              onClick={handleSiren}
              disabled={sirenPlaying}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                sirenPlaying
                  ? 'bg-red-600 text-white border-red-700 animate-bounce'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              {sirenPlaying ? 'SIREN ALARMING...' : 'PLAY SIREN'}
            </button>
          </div>
        </div>

        {/* Leaflet Map Container */}
        <div className="relative flex-1 min-h-[420px] bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 z-10" />

          {/* Floating Live Coordinates Overlay */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-3 shadow-md text-xs space-y-1 max-w-xs text-slate-800">
            <div className="flex items-center justify-between font-bold border-b border-slate-100 pb-1">
              <span className="text-slate-800 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-orange-500" />
                Live GPS Coordinates
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-[11px] pt-1 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[9px]">LATITUDE</span>
                <span className="text-slate-900 font-bold">{location.lat.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">LONGITUDE</span>
                <span className="text-slate-900 font-bold">{location.lng.toFixed(5)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real GPS Receiver Status Bar */}
        <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-2 text-xs border-t border-slate-200">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Hardware GPS Receiver Active • Speed: {location.speed || 0} km/h • Accuracy: ±{location.accuracy || 5}m
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            {new Date(location.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

      </div>

      {/* Right Sidebar: Geofences & GPS Logs (1 col) */}
      <div className="space-y-6">
        
        {/* Dynamic Safe Zones Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-sm text-slate-900">Geofence Safe Zones</h3>
            </div>
            <button
              onClick={() => {
                setNewFenceLat(location.lat);
                setNewFenceLng(location.lng);
                setShowGeofenceModal(true);
              }}
              className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Zone
            </button>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {geofences.length > 0 ? (
              geofences.map(gf => (
                <div key={gf.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${gf.type === 'safe' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {gf.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                        gf.type === 'safe' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {gf.type}
                      </span>
                      {onDeleteGeofence && (
                        <button 
                          onClick={() => onDeleteGeofence(gf.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-500 text-[11px]">Radius: {gf.radiusMeters} meters</p>
                  <button
                    onClick={() => mapInstanceRef.current?.setView([gf.lat, gf.lng], 16)}
                    className="text-[11px] text-orange-600 font-bold hover:underline"
                  >
                    Focus on Map →
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                No geofence zones created yet. Click "+ Add Zone" to create one.
              </div>
            )}
          </div>
        </div>

        {/* Location History Log Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-sm text-slate-900">Recent GPS Logs</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{locationHistory.length} Recorded</span>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {locationHistory.length > 0 ? (
              locationHistory.map((item, index) => (
                <div key={index} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 line-clamp-1">{item.address}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • GPS ±{item.accuracy}m
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No location logs. Turn on GPS in Child Mode to log coordinates.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Geofence Creation Modal */}
      {showGeofenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-600" /> Create Custom Geofence Zone
              </h3>
              <button onClick={() => setShowGeofenceModal(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  value={newFenceName}
                  onChange={e => setNewFenceName(e.target.value)}
                  placeholder="e.g. Grandma's House, Park, Tuition Center"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Zone Type</label>
                  <select
                    value={newFenceType}
                    onChange={e => setNewFenceType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="safe">Safe Area (Green)</option>
                    <option value="restricted">Restricted Area (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Radius (Meters)</label>
                  <input
                    type="number"
                    min={50}
                    max={5000}
                    value={newFenceRadius}
                    onChange={e => setNewFenceRadius(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono">
                <span>Center Coordinates: </span>
                <b>{newFenceLat.toFixed(4)}, {newFenceLng.toFixed(4)}</b>
                <p className="text-[10px] text-slate-400 mt-0.5">Tip: You can also click anywhere on the map to place coordinates.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
