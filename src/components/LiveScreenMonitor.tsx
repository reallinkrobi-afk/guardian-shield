import React, { useState } from 'react';
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
  Sliders, 
  Globe,
  Smartphone,
  Eye,
  ShieldAlert
} from 'lucide-react';

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
  childName
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [customLockMsg, setCustomLockMsg] = useState("Screen time has been locked by Parent. Time to read or sleep!");

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      await onRunAIScan(currentScreenContent, currentApp, currentScreenImage || undefined);
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
                <span className="text-[10px] font-bold font-mono tracking-wider uppercase">Live Sync</span>
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
                  ) : currentScreenImage ? (
                    <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
                      <img 
                        src={currentScreenImage} 
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
                          {currentScreenTitle || 'kids.nationalgeographic.com'}
                        </span>
                      </div>

                      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                        <div className="p-1 bg-indigo-50 rounded border border-indigo-100 text-center">
                          <span className="text-[8px] font-bold text-indigo-700 tracking-wide block uppercase">
                            {currentApp || "Chrome Browser"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="h-1.5 w-12 bg-slate-300 rounded" />
                          <p className="text-[8.5px] text-slate-700 leading-relaxed font-sans bg-white p-2 rounded-lg border border-slate-200 shadow-3xs max-h-[90px] overflow-hidden">
                            {currentScreenContent || 'Explore amazing facts about wild animals, science, space, and historic events.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Process & Content Details Panel (7 cols) */}
            <div className="md:col-span-7 space-y-3.5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Foreground Application</span>
                <span className="px-3 py-1 text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-800 rounded-lg inline-block">
                  {currentApp || "Google Chrome"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Active Page / Window Title</span>
                <p className="text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-800 break-all">
                  {currentScreenTitle || "Home Screen / System Launcher"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Transmitted Screen Text</span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono min-h-[85px] max-h-[120px] overflow-y-auto whitespace-pre-wrap">
                  {currentScreenContent || "Active text transmitted from child phone. Launch Child Mode to simulate or share screen."}
                </div>
              </div>

              <button
                onClick={handleTriggerScan}
                disabled={isScanning}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini AI Safety Radar Scanning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Scan Content with Gemini AI Safety Radar</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Remote Screen Lock & Message Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Sliders className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-900">Remote Screen Lock Controller</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Custom Message on Child Locked Screen
              </label>
              <input
                type="text"
                value={customLockMsg}
                onChange={(e) => setCustomLockMsg(e.target.value)}
                placeholder="e.g. Screen time limit reached. Please read books or rest!"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => onLockScreen("Parent enforced screen lock", customLockMsg)}
                className={`flex-1 py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 text-xs shadow-2xs ${
                  isLocked 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : 'bg-red-600 hover:bg-red-700 text-white border-transparent'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>{isLocked ? 'SCREEN LOCKED' : 'REMOTE LOCK NOW'}</span>
              </button>

              {/* Fixed UNLOCK button calling onUnlockScreen correctly */}
              <button
                onClick={onUnlockScreen}
                disabled={!isLocked}
                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-colors shadow-2xs"
              >
                <Unlock className="w-4 h-4 text-emerald-600" />
                <span>UNLOCK PHONE</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Right Column: Gemini Safety Scan Report & Score (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm text-slate-900">Gemini AI Safety Radar Report</h3>
          </div>

          {/* Safety Score Meter */}
          <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="text-4xl font-black text-slate-900 tracking-tight">
              {aiSafetyStatus.safetyScore}%
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Child Safety Confidence Rating
            </p>
          </div>

          {/* Risk Level Badge */}
          <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${getRiskColor(aiSafetyStatus.riskLevel)}`}>
            {aiSafetyStatus.riskLevel === 'SAFE' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            )}
            <div>
              <span className="font-bold block text-slate-950">Safety Status: {aiSafetyStatus.riskLevel}</span>
              <span className="text-[11px] block mt-0.5 leading-normal">
                {aiSafetyStatus.detectedCategories?.join(', ') || 'General youth safety standards applied'}
              </span>
            </div>
          </div>

          {/* AI Safety Summary & Action */}
          <div className="space-y-3.5 text-xs pt-1">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">AI Content Analysis Summary</span>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-sans">
                {aiSafetyStatus.summary || "Trigger an AI Scan to audit active screen contents for child safety risks."}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Recommended Parent Action</span>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-sans font-medium">
                {aiSafetyStatus.suggestedAction || "Content looks safe. Continue standard monitoring."}
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
