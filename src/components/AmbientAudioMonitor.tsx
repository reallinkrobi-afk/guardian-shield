import React, { useState, useEffect, useRef } from 'react';
import { ChildDeviceState, AudioClipItem } from '../types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Play, 
  Pause, 
  Download, 
  Radio, 
  FileText, 
  Activity,
  VolumeX,
  Volume1
} from 'lucide-react';
import { getApiUrl } from '../App';

interface AmbientAudioMonitorProps {
  deviceState: ChildDeviceState;
  onSendCommand: (command: string, payload?: any) => void;
  deviceId?: string;
}

export const AmbientAudioMonitor: React.FC<AmbientAudioMonitorProps> = ({
  deviceState,
  onSendCommand,
  deviceId
}) => {
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [dbLevel, setDbLevel] = useState(deviceState.audioState?.decibelLevel || 28);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const lastAudioSeqRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isListening = deviceState.audioState?.isListening || false;

  const recordedClips = deviceState.audioState?.recordedClips || [];

  // Animate sound waves dynamically when listening is active
  useEffect(() => {
    if (!isListening) {
      setDbLevel(20);
      setLiveStreamActive(false);
      return;
    }
    const interval = setInterval(() => {
      setDbLevel(Math.floor(Math.random() * 35) + 35);
    }, 300);
    return () => clearInterval(interval);
  }, [isListening]);

  // Real-Time Live Audio Stream Playback Loop
  useEffect(() => {
    if (!isListening) return;

    let isSubscribed = true;
    const pollAudioInterval = setInterval(async () => {
      try {
        const query = deviceId ? `?deviceId=${deviceId}` : '';
        const res = await fetch(getApiUrl(`/api/device/stream-frame${query}`));
        if (res.ok && isSubscribed) {
          const data = await res.json();
          const chunk = data.stream?.audioChunk;
          if (chunk && chunk.seq && chunk.seq > lastAudioSeqRef.current && chunk.audio) {
            lastAudioSeqRef.current = chunk.seq;
            setLiveStreamActive(true);

            if (!isAudioMuted) {
              const audio = new Audio(chunk.audio);
              audio.volume = 1.0;
              audio.play().catch(() => {});
            }
          }
        }
      } catch (err) {}
    }, 800);

    return () => {
      isSubscribed = false;
      clearInterval(pollAudioInterval);
    };
  }, [isListening, isAudioMuted, deviceId]);

  const handleToggleListening = () => {
    const nextState = !isListening;
    onSendCommand('TOGGLE_AUDIO_LISTEN', { 
      isListening: nextState,
      audioMode: nextState ? 'surrounding_talk' : 'off'
    });
  };

  const handlePlayAudio = (clip: AudioClipItem) => {
    if (playingClipId === clip.id) {
      setPlayingClipId(null);
    } else {
      if (clip.audioData) {
        const audio = new Audio(clip.audioData);
        audio.play().catch(() => {});
        audio.onended = () => setPlayingClipId(null);
      }
      setPlayingClipId(clip.id);
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
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Real-Time Ambient Voice Stream</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isListening 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {isListening ? '● LIVE VOICE TRANSMITTING' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Continuous real-time background audio listening from {deviceState.childName}'s phone microphone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {isListening && (
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                  isAudioMuted
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume1 className="w-4 h-4 text-emerald-600" />}
                <span>{isAudioMuted ? 'Muted' : 'Unmuted'}</span>
              </button>
            )}

            <button
              onClick={handleToggleListening}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Stop Live Listening' : 'Start Live Voice Streaming'}</span>
            </button>
          </div>

        </div>

        {/* Live Audio Visualizer & Waveform Bar */}
        {isListening && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 font-mono">LIVE SOUND LEVEL:</span>
              <div className="flex items-center gap-1.5 h-6">
                {[12, 28, 45, 60, 35, 75, 90, 50, 65, 40, 80, 55, 30, 20].map((h, i) => (
                  <div 
                    key={i} 
                    className="w-1.5 bg-gradient-to-t from-orange-500 to-red-500 rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(15, (h * dbLevel) / 90)}%` }}
                  />
                ))}
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">{dbLevel} dB</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-Time Mic Audio Buffer Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Saved Audio Clips Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-orange-600" />
            Recorded Audio Clips
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
                          {clip.timestamp} • Duration: {clip.duration}
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

                  {clip.transcript && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p><span className="text-slate-500 font-semibold">Transcript:</span> {clip.transcript}</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              No recorded audio clips yet. Click <b>Start Live Voice Streaming</b> above to listen in real time.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
