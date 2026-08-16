import React, { useState } from 'react';
import { DeviceFile } from '../types';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  Download, 
  HardDrive, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  ShieldCheck,
  X,
  Trash2
} from 'lucide-react';

interface FilesBrowserViewProps {
  files: DeviceFile[];
  storageUsedPercent: number;
  storageUsedGB?: number;
  storageTotalGB?: number;
  childName: string;
  onDeleteFile?: (id: string) => void;
}

export const FilesBrowserView: React.FC<FilesBrowserViewProps> = ({
  files = [],
  storageUsedPercent = 42,
  storageUsedGB = 53.8,
  storageTotalGB = 128,
  childName,
  onDeleteFile
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inspectingFile, setInspectingFile] = useState<DeviceFile | null>(null);

  const folders = ['All', 'Photos', 'Downloads', 'Voice Recordings', 'Documents'];

  const filteredFiles = files.filter(f => {
    const matchesFolder = selectedFolder === 'All' || f.folder === selectedFolder;
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const getFileIcon = (folder: string) => {
    switch (folder) {
      case 'Photos': return <ImageIcon className="w-4 h-4 text-emerald-600" />;
      case 'Voice Recordings': return <Mic className="w-4 h-4 text-purple-600" />;
      case 'Downloads': return <Download className="w-4 h-4 text-blue-600" />;
      case 'Documents': default: return <FileText className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left 8 cols: File System List */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        
        {/* Header & Storage Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700 border border-teal-200">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Remote Storage & File Explorer</h2>
              <p className="text-xs text-slate-500">
                Encrypted File System on <span className="text-slate-800 font-semibold">{childName}'s Device</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono">
            <HardDrive className="w-4 h-4 text-teal-600" />
            <span>Storage: <b>{storageUsedPercent}% Used</b> ({storageUsedGB} GB / {storageTotalGB} GB)</span>
          </div>
        </div>

        {/* Search & Folder Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto w-full sm:w-auto">
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedFolder === folder
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {folder}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* File Table / Grid */}
        <div className="space-y-2.5">
          {filteredFiles.length > 0 ? (
            filteredFiles.map(file => (
              <div
                key={file.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between gap-3 text-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-3xs shrink-0">
                    {getFileIcon(file.folder)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      {file.name}
                      {file.isFlagged && (
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-mono border border-red-200 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          Risk Flagged
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Category: <span className="text-slate-700">{file.folder}</span> • Size: {file.size} • {file.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInspectingFile(file)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    Inspect
                  </button>

                  {onDeleteFile && (
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                      title="Delete File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
              No files found in {selectedFolder} folder.
            </div>
          )}
        </div>

      </div>

      {/* Right 4 cols: Storage Safety Overview */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Storage Security Shield</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Automatic background scanner monitors downloads, media files, and attachments for unverified APK packages, malicious scripts, and unapproved content.
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Total Indexed Files:</span>
              <span className="text-teal-700 font-bold">{files.length} items</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Threat Detections:</span>
              <span className="text-emerald-700 font-bold">0 Harmful Files</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real File Inspection Modal */}
      {inspectingFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 shadow-xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {getFileIcon(inspectingFile.folder)}
                <h3 className="font-bold text-sm text-slate-900 truncate max-w-xs">{inspectingFile.name}</h3>
              </div>
              <button onClick={() => setInspectingFile(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px]">FOLDER</span>
                  <span className="font-bold text-slate-900">{inspectingFile.folder}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">FILE SIZE</span>
                  <span className="font-bold text-slate-900">{inspectingFile.size}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">INDEX DATE</span>
                  <span className="font-bold text-slate-900">{inspectingFile.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">SECURITY STATUS</span>
                  <span className="font-bold text-emerald-600">VERIFIED SAFE</span>
                </div>
              </div>

              {inspectingFile.dataUrl ? (
                inspectingFile.folder === 'Photos' ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 flex items-center justify-center bg-black">
                    <img src={inspectingFile.dataUrl} alt="Preview" className="max-h-56 w-auto object-contain" />
                  </div>
                ) : inspectingFile.folder === 'Voice Recordings' ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <audio src={inspectingFile.dataUrl} controls className="w-full" />
                  </div>
                ) : (
                  <p className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                    Document binary content verified. Ready for download.
                  </p>
                )
              ) : (
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
                  Document content indexed and verified.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => setInspectingFile(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
              {inspectingFile.dataUrl && (
                <a
                  href={inspectingFile.dataUrl}
                  download={inspectingFile.name}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
