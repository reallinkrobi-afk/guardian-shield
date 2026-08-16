import React from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Smartphone, 
  EyeOff, 
  Download, 
  UserCheck
} from 'lucide-react';

interface StealthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StealthSetupModal: React.FC<StealthSetupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-6 relative text-slate-800 my-8 animate-fade-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">Android APK Build & Stealth Guide</h2>
            <p className="text-xs text-slate-500">Learn how to build native Android APKs & operate silently</p>
          </div>
        </div>

        {/* Overview content */}
        <div className="space-y-4 text-xs leading-relaxed text-slate-600 max-h-[60vh] overflow-y-auto pr-2">
          
          {/* Policy Reminder */}
          <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3 text-orange-850">
            <UserCheck className="w-5 h-5 text-orange-600 shrink-0" />
            <div>
              <span className="font-bold block text-slate-950 text-xs">100% Parent Manual Control Policy:</span>
              <p className="text-[11px] text-slate-700 leading-normal">
                This app operates without background telemetry noise. Parents can monitor child location, active screens, cameras, and block apps in real-time.
              </p>
            </div>
          </div>

          {/* Section 1: Unified App Architecture */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-orange-500" />
              1. One App, Two Modes (Unified Build Architecture)
            </h3>
            <p className="text-slate-600">
              The codebase is structured as a unified hybrid application supporting both roles:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
              <li><b>Parent Mode:</b> Stays open on the guardian's laptop, PC, or smartphone to track logs and send controls.</li>
              <li><b>Child Mode:</b> Set up on the child's physical phone. Once permissions are authorized, the app runs in stealth mode.</li>
            </ul>
          </div>

          {/* Section 2: Building Native APK with Capacitor */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-indigo-600 text-xs flex items-center gap-2">
              <Download className="w-4 h-4" />
              2. How to Compile into a Physical Android APK
            </h3>
            
            <p className="text-slate-600">
              Transform this web workspace into a standalone native Android installation package (`.apk`) using simple terminal commands:
            </p>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 font-mono text-[11px] text-slate-700">
              <span className="text-slate-800 font-bold block">Terminal Commands:</span>
              <div className="bg-slate-50 p-2.5 rounded-lg text-indigo-700 overflow-x-auto space-y-1 border border-slate-100">
                <p># Step 1: Install Capacitor components</p>
                <p>npm install @capacitor/core @capacitor/cli @capacitor/android</p>
                <p># Step 2: Build & sync assets</p>
                <p>npm run build</p>
                <p>npx cap add android</p>
                <p>npx cap open android</p>
              </div>
              <p className="text-slate-500 text-[10px]">
                In Android Studio, click <b>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK</b> to finalize the `.apk` file for distribution.
              </p>
            </div>
          </div>

          {/* Section 3: Stealth Permissions Checklist */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-orange-500" />
              3. Operating in Complete Stealth Mode
            </h3>

            <p className="text-slate-600">
              To keep monitoring active and secure, make sure to enable background configurations on the child's system:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  GPS Tracking
                </span>
                <p className="text-slate-500 text-[10px]">
                  Allow "Always in Background" GPS services to obtain live location updates.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  App Disguise
                </span>
                <p className="text-slate-500 text-[10px]">
                  Optionally hide the icon from the application drawer or change its label to "System Services".
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Got It, Close
          </button>
        </div>

      </div>
    </div>
  );
};
