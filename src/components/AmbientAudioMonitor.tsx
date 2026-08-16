import React, { useState, useEffect, useRef } from 'react';
import { ChildDeviceState, AudioClipItem } from '../types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Activity, 
  Play, 
  Pause, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Radio, 
  FileText, 
  Sparkles, 
  Zap, 
  Info,
  Trash2
} from 'lucide-react';

interface AmbientAudioMonitorProps {
  deviceState: ChildDeviceState;
  onSendCommand: (command: string, payload?: any) => void;
}

export const AmbientAudioMonitor: React.FC<AmbientAudioMonitorProps> = ({
  deviceState,
  onSendCommand
}) => {
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [dbLevel, setDbLevel] = useState(deviceState.audioState?.decibelLevel || 28);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isListening = deviceState.audioState?.isListening || false;

  const recordedClips = deviceState.audioState?.recordedClips || [];

  // Animate sound waves dynamically when listening is active
  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => {
      setDbLevel(Math.floor(Math.random() * 35) + 30);
    }, 350);
    return () => clearInterval(interval);
  }, [isListening]);

  const handleToggleListening = () => {
    const nextState = !isListening;
    onSendCommand('TOGGLE_AUDIO_LISTEN', { 
      isListening: nextState,
      audioMode: nextState ? 'surrounding_talk' : 'off'
    });
  };

  const handlePlayAudio = (clip: AudioClipItem) => {
    if (playingClipId === clip.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingClipId(null);
    } else {
      if (clip.audioData) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio(clip.audioData);
        } else {
          audioPlayerRef.current.src = clip.audioData;
        }
        audioPlayerRef.current.play().catch(() => {});
        audioPlayerRef.current.onended = () => setPlayingClipId(null);
      } else {
        // Synthesize a brief tone for demo fallback clips
        playToneSynthesis();
      }
      setPlayingClipId(clip.id);
    }
  };

  const playToneSynthesis = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
      setTimeout(() => setPlayingClipId(null), 1500);
    } catch (err) {
      setTimeout(() => setPlayingClipId(null), 1500);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Status & Main Live Control */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border ${
              isListening 
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {isListening ? <Radio className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Real-Time Ambient Voice Monitor</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isListening 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {isListening ? 'LIVE FEED STREAMING' : 'STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Listen live to surrounding conversations and room audio from {deviceState.childName}'s phone in stealth mode.
              </p>
            </div>
          </div>

          {/* Main Action Button */}
          <button
            onClick={handleToggleListening}
            className={`w-full md:w-auto px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-150 shadow-xs ${
              isListening 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" /> Stop Live Audio Feed
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" /> Start Live Voice Listening
              </>
            )}
          </button>
        </div>

        {/* Live Audio Visualizer Card when active */}
        {isListening && (
          <div className="mt-5 p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Live Microphone Feed Active • {dbLevel} dB Sound Intensity
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Silent Background Transfer</span>
            </div>

            {/* Audio Spectrum Graphic */}
            <div className="flex items-center justify-center gap-1.5 h-16 px-4 py-2 bg-black/60 rounded-xl overflow-hidden">
              {[...Array(36)].map((_, i) => {
                const heightPercent = isListening 
                  ? Math.min(100, Math.max(15, (Math.sin(i * 0.4 + dbLevel) + 1) * 45 + Math.random() * 20)) 
                  : 10;
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-orange-500 to-amber-400 transition-all duration-150"
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>

            {/* Live AI Transcript */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-orange-400 uppercase tracking-wider text-[10px] block">Live Speech AI Transcript</span>
                <p className="text-slate-200 mt-0.5 italic">
                  "{deviceState.audioState?.lastTranscript || "Ambient voice listening active. Environment is quiet."}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Audio Clips & Safety Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recorded Audio Clips */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-orange-600" />
              Saved Ambient Audio Clips
            </h3>
            <span className="text-xs text-slate-500 font-mono">{recordedClips.length} Clips Available</span>
          </div>

          <div className="space-y-3">
            {recordedClips.length > 0 ? (
              recordedClips.map((clip) => {
                const isPlaying = playingClipId === clip.id;
                return (
                  <div 
                    key={clip.id} 
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePlayAudio(clip)}
                          className={`p-3 rounded-xl transition-all shadow-xs ${
                            isPlaying 
                              ? 'bg-orange-600 text-white animate-pulse' 
                              : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{clip.title}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            <Clock className="w-3 h-3" /> {clip.timestamp} • Duration: {clip.duration}
                          </p>
                        </div>
                      </div>

                      {clip.audioData && (
                        <a 
                          href={clip.audioData} 
                          download={`${clip.title.replace(/\s+/g, '_')}.webm`}
                          className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Download Audio Clip"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* AI Speech Transcript Box */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p><span className="text-slate-500 font-semibold">Transcript:</span> {clip.transcript}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                No recorded ambient audio clips yet. Start live voice listening or record clips on Child Mode.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Audio Protection Policies */}
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Stealth Voice Protection
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Silent Microphone Capture</span>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    Operates without status bar mic indicators or background alert banners on the child's device.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Loud Sound & Distress Alert</span>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    Automated detection for shouting or screaming levels exceeding 85 decibels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
