import React, { useState } from 'react';
import { ActivityLog } from '../types';
import { 
  Clock, 
  MapPin, 
  Smartphone, 
  ShieldAlert, 
  Lock, 
  Camera, 
  AlertTriangle, 
  Folder,
  Radio,
  Filter
} from 'lucide-react';

interface ActivityHistoryViewProps {
  logs: ActivityLog[];
  childName: string;
}

export const ActivityHistoryView: React.FC<ActivityHistoryViewProps> = ({ logs = [], childName }) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'danger' | 'warning' | 'info'>('all');

  const filteredLogs = logs.filter(log => {
    if (filterSeverity === 'all') return true;
    return log.severity === filterSeverity;
  });

  const getLogIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'location': return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'app_used': return <Smartphone className="w-4 h-4 text-blue-600" />;
      case 'safety_alert': return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'lock': return <Lock className="w-4 h-4 text-amber-600" />;
      case 'camera_snapshot': return <Camera className="w-4 h-4 text-purple-600" />;
      case 'audio_listen': return <Radio className="w-4 h-4 text-emerald-600" />;
      case 'sos': return <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: ActivityLog['severity']) => {
    switch (severity) {
      case 'danger':
        return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-mono font-bold border border-red-200">DANGER</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-bold border border-amber-200">WARNING</span>;
      case 'info': default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">INFO</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-orange-600 border border-slate-200">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">System Activity & Audit Logs</h2>
            <p className="text-xs text-slate-500">
              Chronological security timeline for <span className="text-slate-800 font-semibold">{childName}'s Device</span>
            </p>
          </div>
        </div>

        {/* Severity Filter Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterSeverity === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilterSeverity('danger')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterSeverity === 'danger' ? 'bg-red-600 text-white shadow-2xs' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setFilterSeverity('warning')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filterSeverity === 'warning' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            Warnings
          </button>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {filteredLogs.length > 0 ? (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                log.severity === 'danger'
                  ? 'bg-red-50/70 border-red-200'
                  : log.severity === 'warning'
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-3xs shrink-0 mt-0.5">
                  {getLogIcon(log.type)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{log.title}</h3>
                    {getSeverityBadge(log.severity)}
                  </div>
                  <p className="text-slate-600 leading-relaxed font-sans">{log.message}</p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0 font-semibold">
                {log.timestamp}
              </span>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            No events logged for current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
