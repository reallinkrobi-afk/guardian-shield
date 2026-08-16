import React, { useState } from 'react';
import { AppUsageItem } from '../types';
import { 
  BarChart2, 
  Lock, 
  Unlock, 
  Smartphone, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Globe, 
  Video, 
  MessageSquare, 
  Gamepad2, 
  AlertTriangle,
  Sliders,
  UserCheck,
  Plus,
  Trash2
} from 'lucide-react';

interface AppUsageControlProps {
  appUsageLogs: AppUsageItem[];
  blockedApps: string[];
  onToggleAppBlock: (appName: string) => void;
  childName: string;
}

export const AppUsageControl: React.FC<AppUsageControlProps> = ({
  appUsageLogs = [],
  blockedApps = [],
  onToggleAppBlock,
  childName
}) => {
  const [newAppName, setNewAppName] = useState('');
  const [newAppCategory, setNewAppCategory] = useState<AppUsageItem['category']>('Social');

  const totalMinutes = appUsageLogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const getAppIcon = (iconName: string) => {
    switch (iconName) {
      case 'globe': return <Globe className="w-4 h-4 text-blue-500" />;
      case 'youtube': return <Video className="w-4 h-4 text-rose-500" />;
      case 'message-square': return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'gamepad-2': return <Gamepad2 className="w-4 h-4 text-purple-500" />;
      default: return <Smartphone className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    onToggleAppBlock(newAppName.trim());
    setNewAppName('');
  };

  return (
    <div className="space-y-6">
      
      {/* Policy Banner */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-600 border border-orange-200 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">App Usage Limits & Instant Remote Lock</h3>
            <p className="text-slate-500">
              When an app is blocked here, it will be locked immediately on {childName}'s phone with a parental safety shield.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200 shrink-0 hidden sm:block">
          Active Enforced
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 cols: App Usage List & Blocking Toggles */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">App Screen Time & Access Controls</h2>
                <p className="text-xs text-slate-500">
                  Daily Usage Breakdown for <span className="text-slate-800 font-semibold">{childName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Total Screen Time: <b>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</b></span>
            </div>
          </div>

          {/* App List */}
          <div className="space-y-3">
            {appUsageLogs.length > 0 ? (
              appUsageLogs.map((app) => {
                const isBlocked = app.isBlocked || blockedApps.includes(app.appName);
                const percentage = totalMinutes > 0 ? Math.round((app.durationMinutes / totalMinutes) * 100) : 0;

                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isBlocked
                        ? 'bg-red-50/50 border-red-200 opacity-90'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
                        {getAppIcon(app.icon)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900">{app.appName}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                            {app.category}
                          </span>
                          {app.isFlagged && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Review Advised
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          Pkg: <span className="text-slate-700">{app.packageName}</span> • Last active: {app.lastUsed}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-slate-900 block">
                          {Math.floor(app.durationMinutes / 60) > 0 ? `${Math.floor(app.durationMinutes / 60)}h ` : ''}
                          {app.durationMinutes % 60}m
                        </span>
                        <span className="text-[10px] text-slate-400">{percentage}% of daily screen time</span>
                      </div>

                      <button
                        onClick={() => onToggleAppBlock(app.appName)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                          isBlocked
                            ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {isBlocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{isBlocked ? 'BLOCKED' : 'ALLOWED'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400">
                No app usage activity recorded yet.
              </div>
            )}
          </div>

        </div>

        {/* Right 4 cols: Blocked Summary & Custom App Addition */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Blocked List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Lock className="w-4 h-4 text-red-500" />
              <h3 className="font-bold text-sm text-slate-900">Restricted Apps ({blockedApps.length})</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              These apps are instantly blocked when the child attempts to open them.
            </p>

            <div className="space-y-2">
              {blockedApps.length > 0 ? (
                blockedApps.map((appName, idx) => (
                  <div key={idx} className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-red-600" />
                      {appName}
                    </span>
                    <button
                      onClick={() => onToggleAppBlock(appName)}
                      className="text-[11px] text-red-600 hover:underline font-bold"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                  No apps currently blocked.
                </div>
              )}
            </div>
          </div>

          {/* Quick Custom App Block Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-orange-500" /> Block Any Custom App
            </h4>
            <form onSubmit={handleAddCustomApp} className="space-y-2.5 text-xs">
              <input
                type="text"
                value={newAppName}
                onChange={e => setNewAppName(e.target.value)}
                placeholder="e.g. TikTok, Free Fire, Instagram"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-2xs"
              >
                Add to Block List
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
