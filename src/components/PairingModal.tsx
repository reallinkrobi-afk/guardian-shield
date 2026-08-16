import React, { useState, useEffect } from 'react';
import { 
  Link, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Wifi, 
  Battery, 
  AlertCircle
} from 'lucide-react';
import { ChildDeviceState } from '../types';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceState: ChildDeviceState;
  onPairDevice: (code: string) => void;
  onResetDevice?: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  deviceState,
  onPairDevice,
  onResetDevice
}) => {
  const [inputCode, setInputCode] = useState('');
  const [pairedCode, setPairedCode] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('parent_paired_code');
    if (saved) {
      setPairedCode(saved);
      setInputCode(saved);
    } else if (deviceState.pairingCode) {
      setPairedCode(deviceState.pairingCode);
      setInputCode(deviceState.pairingCode);
    }
  }, [deviceState.pairingCode]);

  if (!isOpen) return null;

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim();
    
    if (!cleanCode) {
      setErrorMsg('Please enter a valid 6-digit Connection Code (e.g. 592-104)');
      return;
    }

    setErrorMsg('');
    localStorage.setItem('parent_paired_code', cleanCode);
    setPairedCode(cleanCode);
    onPairDevice(cleanCode);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
    }, 3000);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('parent_paired_code');
    setPairedCode(null);
    setInputCode('');
    if (onResetDevice) {
      onResetDevice();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-xl">
        
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Pair Child Phone
              </h2>
              <p className="text-xs text-slate-500">Secure Cloud Connection Daemon</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Pairing Instructions */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              <Smartphone className="w-4 h-4 text-orange-500" />
              How to Link:
            </div>
            <ol className="text-slate-600 space-y-1 list-decimal pl-4 leading-relaxed text-[11px]">
              <li>Open this app on the child phone and switch to <b>Child Mode</b>.</li>
              <li>Read the 6-digit <b>Connection Code</b> displayed on the phone.</li>
              <li>Enter that code here and click <b>Connect Device</b>.</li>
            </ol>
          </div>

          {/* Success Notification */}
          {isSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Connected Successfully!</span>
                Child device telemetry stream is active.
              </div>
            </div>
          )}

          {/* Error Notification */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Connection Status Card */}
          {pairedCode ? (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Link Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  ACTIVE SYNCED
                </span>
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Paired Code</span>
                  <span className="text-xl font-extrabold font-mono text-slate-900">
                    {pairedCode}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Status</span>
                  <span className="text-xs font-bold text-emerald-600">
                    Online
                  </span>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition-all"
              >
                Disconnect Device
              </button>
            </div>
          ) : null}

          {/* Pairing Code Form */}
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Enter Child Pairing Code:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="e.g. 592-104"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-slate-900 tracking-widest placeholder:text-slate-300 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setInputCode(deviceState.pairingCode)}
                  className="absolute right-2 top-2 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
                >
                  Use {deviceState.pairingCode}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              Connect Device
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Guardian Shield Cloud Sync</span>
          <button onClick={onClose} className="text-slate-700 font-bold hover:underline">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
