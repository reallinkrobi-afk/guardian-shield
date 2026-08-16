import React, { useState, useEffect } from 'react';
import { AISafetyReport, RiskLevel } from '../types';
import { 
  Monitor, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Globe,
  Smartphone,
  ShieldAlert
} from 'lucide-react';
import { getApiUrl } from '../App';

interface LiveScreenMonitorProps {
  currentApp: string;
  currentScreenTitle: string;
  currentScreenContent: string;
  currentScreenImage: string | null;
  aiSafetyStatus: AISafetyReport;
  isLocked: boolean;
  onLockScreen: (reason: string, customMessage?: string) => void;
  onUnlockScreen: () => void;
  onRunAIScan: (content: string, app: string, imageBase64?: string) => Promise<void>;
  childName: string;
  deviceId?: string;
}

export const LiveScreenMonitor: React.FC<LiveScreenMonitorProps> = ({
  currentApp,
  currentScreenTitle,
  currentScreenContent,
  currentScreenImage,
  aiSafetyStatus,
  isLocked,
  onLockScreen,
  onUnlockScreen,
  onRunAIScan,
  childName,
  deviceId
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [customLockMsg, setCustomLockMsg] = useState("Screen time has been locked by Parent. Time to read or sleep!");
  const [liveScreenFrame, setLiveScreenFrame] = useState<string | null>(currentScreenImage);

  // Poll for real-time live screen cast frames
  useEffect(() => {
    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const query = deviceId ? `?deviceId=${deviceId}` : '';
        const res = await fetch(getApiUrl(`/api/device/stream-frame${query}`));
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (data.success && data.stream?.screenFrame?.frame) {
            setLiveScreenFrame(data.stream.screenFrame.frame);
          }
        }
      } catch (e) {}
    }, 800);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [deviceId]);

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      await onRunAIScan(currentScreenContent, currentApp, (liveScreenFrame || currentScreenImage) || undefined);
    } finally {
      setIsScanning(false);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'DANGER': return 'bg-red-50 border-red-200 text-red-700';
      case 'CAUTION': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
  };

  const activeImage = liveScreenFrame || currentScreenImage;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Live Screen Viewer & Remote Lock (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Screen Activity Viewer Card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Live Visual Screen Stream</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold font-mono tracking-wider uppercase">Live Stream Cast</span>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Visual Phone Preview (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-start py-1">
              <div className="relative w-full max-w-[210px] aspect-[9/18.5] bg-slate-950 border-[6px] border-slate-900 rounded-[28px] overflow-hidden shadow-lg flex flex-col">
                
                {/* Phone Notch */}
                <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 flex items-center justify-center z-50">
                  <div className="w-10 h-2 bg-black rounded-full" />
                </div>

                {/* Screen Content */}
                <div className="flex-1 bg-slate-50 pt-4 flex flex-col relative text-slate-800 overflow-hidden font-sans">
                  
                  {isLocked ? (
                    <div className="absolute inset-0 bg-slate-950/95 z-30 flex flex-col items-center justify-center p-4 text-center text-white">
                      <Lock className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-red-400">Device Locked</span>
                      <p className="text-[9px] text-slate-300 mt-2 leading-relaxed px-1">
                        "{customLockMsg || 'Screen time has been locked by Parent.'}"
                      </p>
                    </div>
                  ) : activeImage ? (
                    <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
                      <img 
                        src={activeImage} 
                        alt="Live child screen stream" 
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-2 left-2 bg-red-600 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md">
                        <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                        LIVE CAST
                      </div>
                    </div>
                  ) : (
                    /* Simulated Webpage / App View */
                    <div className="flex-1 flex flex-col bg-slate-100">
                      <div className="bg-white border-b border-slate-200 p-1.5 px-2 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-[9px] font-mono text-slate-600 truncate flex-1">
                          {currentScreenTitle || 'Standby'}
                        </span>
                      </div>

                      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                        <div className="p-1 bg-indigo-50 rounded border border-indigo-100 text-center">
                          <span className="text-[8px] font-bold text-indigo-700 tracking-wide block uppercase">
                            {currentApp || "Device Standby"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-snug">
                          {currentScreenContent || "Waiting for active screen interaction from child device."}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Screen Telemetry & Metadata (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">Active Foreground App</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-sm text-slate-900">{currentApp || "Standby / Idle"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">Live Screen Title</span>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5 line-clamp-1">
                    {currentScreenTitle || "No active title"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider block mb-1">
                    OCR / Text Extracted on Device
                  </span>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-sans">
                    {currentScreenContent || "No text data detected yet."}
                  </p>
                </div>

              </div>

              {/* Instant Lock Remote Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {isLocked ? (
                  <button
                    onClick={onUnlockScreen}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock Device Screen
                  </button>
                ) : (
                  <button
                    onClick={() => onLockScreen("Safety policy limit reached", customLockMsg)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Instantly Lock Device
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Right Column: AI Safety Radar (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-sm text-slate-900">Gemini Safety Radar</h3>
            </div>
            
            <button
              onClick={handleTriggerScan}
              disabled={isScanning}
              className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
            </button>
          </div>

          <div className={`p-4 rounded-xl border ${getRiskColor(aiSafetyStatus.riskLevel)} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-widest font-mono">
                SAFETY LEVEL: {aiSafetyStatus.riskLevel}
              </span>
              <span className="text-xs font-bold font-mono">
                {aiSafetyStatus.safetyScore}/100
              </span>
            </div>
            <p className="text-xs font-medium leading-relaxed">
              {aiSafetyStatus.summary}
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">
              Detected Categories
            </span>
            <div className="flex flex-wrap gap-1.5">
              {aiSafetyStatus.detectedCategories?.map((cat, i) => (
                <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg font-medium border border-slate-200">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <b className="text-slate-800 block mb-0.5">Recommended Action:</b>
            {aiSafetyStatus.suggestedAction}
          </div>
        </div>

      </div>

    </div>
  );
};
