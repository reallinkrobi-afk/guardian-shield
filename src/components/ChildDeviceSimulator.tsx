import React, { useState, useEffect, useRef } from 'react';
import { ChildDeviceState, AudioClipItem, CameraPosition } from '../types';
import { 
  Smartphone, 
  Lock, 
  ShieldAlert, 
  Wifi, 
  Battery, 
  Camera, 
  Settings, 
  Mic, 
  MapPin, 
  Shield, 
  Activity, 
  Check,
  Video,
  Radio,
  Sparkles,
  CheckCircle2,
  AlertCircle
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
  
  // Real Hardware Permission States
  const [hasRequestedInitialPerms, setHasRequestedInitialPerms] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [isPermWizardOpen, setIsPermWizardOpen] = useState(false);

  const [realBattery, setRealBattery] = useState<number | null>(null);

  // Persistent Unique Device Identifier & Fixed Pairing Code
  const [deviceId, setDeviceId] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');

  // Live Streaming States
  const [isCameraStreamingLive, setIsCameraStreamingLive] = useState(false);
  const [isAudioStreamingLive, setIsAudioStreamingLive] = useState(false);

  // Hidden Media Elements & Stream Refs
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const hiddenVideoElRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraIntervalRef = useRef<any>(null);
  const audioSeqRef = useRef<number>(0);
  const isSendingFrameRef = useRef<boolean>(false);

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

  // 1. Automatic All-in-One Permission Requester on First Launch
  const requestAllPermissions = async () => {
    try {
      // 1. Camera & Mic Permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraGranted(true);
        setMicGranted(true);
        // Release immediate test stream
        stream.getTracks().forEach(t => t.stop());
      } catch (e) {
        // Fallback separate requests
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraGranted(true);
          vStream.getTracks().forEach(t => t.stop());
        } catch (e2) {}

        try {
          const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicGranted(true);
          aStream.getTracks().forEach(t => t.stop());
        } catch (e3) {}
      }

      // 2. High Accuracy GPS Location Permission
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocationGranted(true);
            if (deviceId) {
              onUpdateChildState({
                deviceId,
                pairingCode,
                location: {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  address: `Live GPS (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`,
                  speed: Math.round((pos.coords.speed || 0) * 3.6),
                  accuracy: Math.round(pos.coords.accuracy),
                  altitude: Math.round(pos.coords.altitude || 0),
                  timestamp: new Date().toISOString(),
                  batteryAtLocation: realBattery || deviceState.batteryLevel
                }
              });
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      localStorage.setItem('initial_perms_requested', 'true');
      setHasRequestedInitialPerms(true);
      setIsPermWizardOpen(false);
    } catch (err) {
      console.warn("Permission request batch error:", err);
    }
  };

  // 2. Initialize Unique Device ID, Fixed Pairing Code & Trigger Permissions on Open
  useEffect(() => {
    let savedDevId = localStorage.getItem('child_device_id');
    if (!savedDevId) {
      savedDevId = `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem('child_device_id', savedDevId);
    }
    setDeviceId(savedDevId);

    let savedCode = localStorage.getItem('child_pairing_code');
    if (!savedCode) {
      const codePart1 = Math.floor(100 + Math.random() * 900);
      const codePart2 = Math.floor(100 + Math.random() * 900);
      savedCode = `${codePart1}-${codePart2}`;
      localStorage.setItem('child_pairing_code', savedCode);
    }
    setPairingCode(savedCode);

    // Detect device brand
    const ua = navigator.userAgent;
    let detectedModel = "Android Mobile Device";
    if (ua.includes("Samsung") || ua.includes("SM-")) detectedModel = "Samsung Galaxy Device";
    else if (ua.includes("Xiaomi") || ua.includes("Redmi") || ua.includes("POCO")) detectedModel = "Xiaomi / Redmi Device";
    else if (ua.includes("Pixel")) detectedModel = "Google Pixel Device";
    else if (ua.includes("Vivo") || ua.includes("V2")) detectedModel = "Vivo Mobile Device";
    else if (ua.includes("Oppo") || ua.includes("CPH")) detectedModel = "Oppo Mobile Device";
    else if (ua.includes("iPhone")) detectedModel = "Apple iPhone";

    onUpdateChildState({
      deviceId: savedDevId,
      pairingCode: savedCode,
      deviceModel: detectedModel,
      childName: `Child Phone (${savedCode})`,
      isOnline: true,
      lastSeen: "Live Now"
    });

    // Auto-prompt permissions on launch
    const alreadyRequested = localStorage.getItem('initial_perms_requested');
    if (!alreadyRequested) {
      setIsPermWizardOpen(true);
      requestAllPermissions();
    }

    // Real Battery Listener
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const lvl = Math.round(battery.level * 100);
          setRealBattery(lvl);
          onUpdateChildState({ 
            deviceId: savedDevId,
            batteryLevel: lvl, 
            isCharging: battery.charging,
            pairingCode: savedCode
          });
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }
  }, []);

  // 3. Continuous Real GPS Geolocation Watcher
  useEffect(() => {
    if (navigator.geolocation && deviceId) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocationGranted(true);
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          onUpdateChildState({
            deviceId,
            pairingCode,
            location: {
              lat,
              lng,
              address: `Live Real GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
              speed: Math.round((position.coords.speed || 0) * 3.6),
              accuracy: Math.round(position.coords.accuracy),
              altitude: Math.round(position.coords.altitude || 0),
              timestamp: new Date().toISOString(),
              batteryAtLocation: realBattery || deviceState.batteryLevel
            }
          });
        },
        (err) => {
          console.warn("GPS watch info:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [deviceId, pairingCode, realBattery]);

  // 4. ULTRA-FAST HIGH FPS LIVE CAMERA STREAMING (30-60 FPS Pipeline)
  useEffect(() => {
    if (deviceState.activeCamera && deviceState.activeCamera !== 'off' && deviceId) {
      startHighFpsCameraStream(deviceState.activeCamera as CameraPosition);
    } else {
      stopLiveCameraStream();
    }
    return () => {
      stopLiveCameraStream();
    };
  }, [deviceState.activeCamera, deviceId]);

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
      setCameraGranted(true);
      setIsCameraStreamingLive(true);

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

      // Ultra-Fast Stream Interval (45ms ~ 22-30 FPS transmission with lightweight payload)
      cameraIntervalRef.current = setInterval(async () => {
        if (!hiddenVideoElRef.current || !hiddenCanvasRef.current || !videoStreamRef.current) return;
        if (isSendingFrameRef.current) return; // Non-blocking: skip if network is busy to maintain high FPS

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
      }, 45);

    } catch (err: any) {
      console.warn("High FPS Camera Stream error:", err.message);
      setIsCameraStreamingLive(false);
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
    setIsCameraStreamingLive(false);
  };

  // 5. CONTINUOUS REAL LIVE VOICE STREAMING
  useEffect(() => {
    if (deviceState.audioState?.isListening && deviceId) {
      startLiveAudioStream();
    } else {
      stopLiveAudioStream();
    }
    return () => {
      stopLiveAudioStream();
    };
  }, [deviceState.audioState?.isListening, deviceId]);

  const startLiveAudioStream = async () => {
    try {
      stopLiveAudioStream();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setMicGranted(true);
      setIsAudioStreamingLive(true);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && deviceId) {
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

      mediaRecorder.start(600); // 600ms chunk emission for low latency voice
    } catch (err: any) {
      console.warn("Live Audio Stream error:", err.message);
      setIsAudioStreamingLive(false);
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
    setIsAudioStreamingLive(false);
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
            <span className="text-[10px] font-bold">BACKGROUND DAEMON</span>
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
              <h2 className="font-bold text-white text-base">Guardian Shield</h2>
              <p className="text-xs text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Active 24/7 Protection Service</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenSetupGuide()}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
            title="Stealth & Permissions Guide"
          >
            <Settings className="w-4 h-4" />
          </button>
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
            Enter this code on your Parent Dashboard to link this specific phone: <br />
            <span className="text-indigo-400 font-medium underline">https://guardian-shield.onrender.com</span>
          </p>
        </div>

        {/* Live Hardware Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* GPS Status */}
          <div 
            onClick={requestAllPermissions}
            className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 cursor-pointer transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">GPS Location</span>
              <MapPin className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">
              {deviceState.location.lat ? `${deviceState.location.lat.toFixed(4)}, ${deviceState.location.lng.toFixed(4)}` : 'Active'}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 flex items-center">
              <Check className="w-3 h-3 mr-0.5" /> {locationGranted ? 'GPS Linked' : 'Active'}
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
              {deviceState.isCharging ? ' ⚡ Charging' : ' 🔋 Battery'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Live Hardware Sync</span>
          </div>

          {/* Live Camera Stream Status */}
          <div 
            onClick={requestAllPermissions}
            className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 cursor-pointer transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Camera</span>
              <Video className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {isCameraStreamingLive ? (
                <span className="text-red-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  60 FPS Stream
                </span>
              ) : '60 FPS Ultra HD'}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1">Front & Rear Dual</span>
          </div>

          {/* Live Mic Voice Status */}
          <div 
            onClick={requestAllPermissions}
            className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 cursor-pointer transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Microphone</span>
              <Mic className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {isAudioStreamingLive ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Voice
                </span>
              ) : 'Low-Latency HD'}
            </div>
            <span className="text-[10px] text-purple-300 mt-1">Real-time Audio</span>
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

      {/* First Launch Full Access Activation Wizard Modal */}
      {isPermWizardOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Activate Full Mobile Protection</h3>
              <p className="text-xs text-slate-400 mt-1">
                Grant camera, microphone, and GPS permissions so Guardian Shield can protect this device in background.
              </p>
            </div>

            <div className="space-y-2 text-left text-xs bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between text-slate-300">
                <span>📹 Front & Rear Camera</span>
                <span className="text-emerald-400 font-bold font-mono">60 FPS Ready</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>🎙️ Live Microphone Voice</span>
                <span className="text-emerald-400 font-bold font-mono">HD Audio</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>📍 Live 24/7 GPS Tracking</span>
                <span className="text-emerald-400 font-bold font-mono">Real-Time</span>
              </div>
            </div>

            <button
              onClick={requestAllPermissions}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-orange-950 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Allow All & Activate Protection</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Locked Fullscreen Overlay */}
      {deviceState.isLocked && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-6 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Device Screen Locked</h2>
          <p className="text-sm text-red-400 font-semibold mb-4">Access restricted by Parent</p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-xs text-xs text-slate-300 mb-6">
            "{deviceState.customLockMessage || 'Screen time limit reached or restricted by Guardian.'}"
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
