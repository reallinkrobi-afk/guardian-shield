import React from 'react';
import { ViewMode, ActiveTab } from '../types';
import { 
  ShieldCheck, 
  Smartphone, 
  MapPin, 
  Monitor, 
  Camera, 
  Mic, 
  BarChart2, 
  Folder, 
  Clock, 
  EyeOff, 
  Lock, 
  Unlock, 
  Link,
  Wifi,
  BatteryCharging,
  Battery,
  ShieldAlert
} from 'lucide-react';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onOpenSetupGuide: () => void;
  onOpenPairingModal: () => void;
  pairingCode?: string;
  childName: string;
  batteryLevel: number;
  isCharging: boolean;
  isOnline: boolean;
  safetyScore: number;
  riskLevel: string;
  activeCamera?: string;
  isAudioListening?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
  isLocked,
  onToggleLock,
  onOpenSetupGuide,
  onOpenPairingModal,
  pairingCode,
  childName,
  batteryLevel,
  isCharging,
  isOnline,
  safetyScore,
  riskLevel,
  activeCamera = 'off',
  isAudioListening = false
}) => {
  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }> = [
    { 
      id: 'location', 
      label: 'Live GPS', 
      icon: <MapPin className="w-3.5 h-3.5 text-orange-500" /> 
    },
    { 
      id: 'screen', 
      label: 'Screen AI Radar', 
      icon: <Monitor className="w-3.5 h-3.5 text-indigo-500" />,
      badge: riskLevel === 'DANGER' ? (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
      ) : undefined
    },
    { 
      id: 'camera', 
      label: 'Dual Camera', 
      icon: <Camera className="w-3.5 h-3.5 text-purple-500" />,
      badge: activeCamera !== 'off' ? (
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
      ) : undefined
    },
    { 
      id: 'audio', 
      label: 'Ambient Audio', 
      icon: <Mic className="w-3.5 h-3.5 text-emerald-500" />,
      badge: isAudioListening ? (
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
      ) : undefined
    },
    { 
      id: 'apps', 
      label: 'App Controls', 
      icon: <BarChart2 className="w-3.5 h-3.5 text-blue-500" /> 
    },
    { 
      id: 'files', 
      label: 'File Storage', 
      icon: <Folder className="w-3.5 h-3.5 text-amber-500" /> 
    },
    { 
      id: 'history', 
      label: 'Activity Logs', 
      icon: <Clock className="w-3.5 h-3.5 text-slate-500" /> 
    },
    { 
      id: 'stealth', 
      label: 'Stealth & APK', 
      icon: <EyeOff className="w-3.5 h-3.5 text-rose-500" /> 
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3 border-b border-slate-100">
          
          {/* Brand & Target Child */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm shadow-orange-500/20 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight text-slate-900 flex items-center gap-2">
                  Guardian <span className="text-orange-600 font-semibold">Shield</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Live Sync
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                  Target: <span className="text-slate-800 font-semibold">{isOnline ? childName : 'No Device Paired'}</span>
                  {isOnline && pairingCode && (
                    <span className="text-[10px] text-slate-400">({pairingCode})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Mobile Online Status Indicator */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {isOnline ? 'Live Online' : 'No Device'}
              </div>
            </div>
          </div>

          {/* Parent Portal Status Badge */}
          <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span>Parent Control Center</span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Battery & Network Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className={isOnline ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                {isOnline ? 'Live Online' : 'No Device Connected'}
              </span>
              {isOnline && (
                <>
                  <div className="w-px h-3 bg-slate-200" />
                  {isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span className="font-bold text-slate-800">{batteryLevel}%</span>
                </>
              )}
            </div>

            {/* Pair Device Modal Button */}
            <button
              onClick={onOpenPairingModal}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Link className="w-3.5 h-3.5 text-orange-600" />
              <span>Pair Device</span>
            </button>

            {/* Instant Screen Lock / Unlock Toggle Button */}
            <button
              onClick={onToggleLock}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-150 shadow-xs ${
                isLocked
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'DEVICE LOCKED' : 'LOCK SCREEN'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Parent Navigation Bar: All 8 Tabs */}
        {viewMode === 'parent' && (
          <nav className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge}
                </button>
              );
            })}
          </nav>
        )}

      </div>
    </header>
  );
};
