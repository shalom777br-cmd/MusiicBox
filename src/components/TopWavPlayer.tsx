import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, Volume2, Download, Sparkles } from 'lucide-react';
import { MusicNote, MusicBoxSettings, ScoreMeta } from '../types';
import { MusicBoxAudioEngine } from '../utils/audioEngine';

interface TopWavPlayerProps {
  notes: MusicNote[];
  settings: MusicBoxSettings;
  meta: ScoreMeta;
}

export default function TopWavPlayer({ notes, settings, meta }: TopWavPlayerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset generated URL when notes or settings timbre change
  useEffect(() => {
    if (wavUrl) {
      URL.revokeObjectURL(wavUrl);
      setWavUrl(null);
      setIsPlaying(false);
    }
  }, [notes.length, settings.timbre, settings.tempoBpm, settings.keyShift]);

  const generateAndGetWavUrl = async (): Promise<string | null> => {
    if (notes.length === 0) return null;
    setIsGenerating(true);
    try {
      const blob = await MusicBoxAudioEngine.renderToWavBlob(notes, settings);
      const url = URL.createObjectURL(blob);
      setWavUrl(url);
      return url;
    } catch (err) {
      console.error('Failed to generate WAV for top player:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePlay = async () => {
    if (notes.length === 0) return;

    let currentUrl = wavUrl;
    if (!currentUrl) {
      currentUrl = await generateAndGetWavUrl();
      if (!currentUrl) return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (e) {
          console.warn('Playback error, reloading audio element:', e);
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    }
  };

  const cleanFileName = (meta.title || 'MusicBox').replace(/[/\\?%*:|"<>]/g, '_');

  const handleDownload = async () => {
    let url = wavUrl;
    if (!url) {
      url = await generateAndGetWavUrl();
      if (!url) return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanFileName}_${settings.timbre}_高音質オルゴール.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#2d1b14] via-[#382017] to-[#2d1b14] border-2 border-[#c19a6b]/50 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Play Button & Main Header */}
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <button
            onClick={handleTogglePlay}
            disabled={isGenerating || notes.length === 0}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#c19a6b] to-[#e5d3b3] hover:from-[#d4ac7d] hover:to-[#f0e2ca] text-[#1c0f0a] flex items-center justify-center shrink-0 shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            title="生成されたWAV音源を試聴再生"
          >
            {isGenerating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-1" />
            )}
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#c19a6b]" />
              <h2 className="text-base sm:text-lg font-bold text-[#e5d3b3] tracking-wide">
                生成されたWAV音源の試聴再生
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-[#1c0f0a] border border-[#c19a6b]/40 text-[#c19a6b] rounded-full font-semibold">
                最優先試聴
              </span>
            </div>
            <p className="text-xs text-[#e5d3b3]/80 mt-0.5">
              {meta.title ? `曲名: 「${meta.title}」` : '選択中の楽曲'} | 音色: {settings.timbre} | 音符数: {notes.length}音
            </p>
          </div>
        </div>

        {/* Center / Right Side: Native Audio Player & Download Button */}
        <div className="flex flex-wrap items-center justify-between md:justify-end w-full md:w-auto gap-3">
          {/* HTML5 Audio Player */}
          <div className="flex items-center space-x-2">
            {wavUrl ? (
              <audio
                ref={audioRef}
                src={wavUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                controls
                className="h-9 w-48 sm:w-60 accent-[#c19a6b]"
              />
            ) : (
              <button
                onClick={handleTogglePlay}
                disabled={isGenerating || notes.length === 0}
                className="flex items-center space-x-1.5 text-xs px-3.5 py-2 rounded-xl bg-[#1c0f0a] border border-[#3d251a] hover:border-[#c19a6b] text-[#c19a6b] transition-all cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isGenerating ? 'WAV生成中...' : 'WAV音源をロードして試聴'}</span>
              </button>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={notes.length === 0}
            className="flex items-center space-x-2 text-xs px-4 py-2.5 rounded-xl bg-[#c19a6b] hover:bg-[#d4ac7d] text-[#1c0f0a] font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>WAV保存</span>
          </button>
        </div>
      </div>
    </div>
  );
}
