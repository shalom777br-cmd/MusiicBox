import React, { useState } from 'react';
import {
  Download,
  FileAudio,
  FileCode,
  Music,
  Check,
  Loader2,
  Sparkles,
  Share2,
} from 'lucide-react';
import { MusicNote, MusicBoxSettings, ScoreMeta } from '../types';
import { generateMIDI } from '../utils/musicParsers';
import { MusicBoxAudioEngine } from '../utils/audioEngine';

interface ExportPanelProps {
  notes: MusicNote[];
  settings: MusicBoxSettings;
  meta: ScoreMeta;
}

export default function ExportPanel({ notes, settings, meta }: ExportPanelProps) {
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const cleanFileName = (meta.title || 'MusicBox').replace(/[/\\?%*:|"<>]/g, '_');

  // Export MIDI File (.mid)
  const handleDownloadMIDI = () => {
    try {
      const midiBytes = generateMIDI(notes, settings.tempoBpm);
      const blob = new Blob([midiBytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}_オルゴール.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess('MIDIファイルをダウンロードしました');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('MIDI export error:', err);
    }
  };

  // Export High-Quality WAV Audio File (.wav)
  const handleDownloadWAV = async () => {
    if (notes.length === 0) return;
    setIsExportingWav(true);
    try {
      const wavBlob = await MusicBoxAudioEngine.renderToWavBlob(notes, settings);
      const url = URL.createObjectURL(wavBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}_${settings.timbre}_オルゴール音源.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess('高音質WAV音源をダウンロードしました');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('WAV export error:', err);
    } finally {
      setIsExportingWav(false);
    }
  };

  // Export JSON Score Data
  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify({ meta, settings, notes }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanFileName}_楽譜データ.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess('楽譜JSONデータをダウンロードしました');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="bg-[#2d1b14] border border-[#3d251a] rounded-[32px] p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-5">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#3d251a] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#1c0f0a] border border-[#3d251a] flex items-center justify-center text-[#c19a6b]">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif italic text-[#c19a6b]">③ オルゴール音源・データのダウンロード</h2>
            <p className="text-xs text-[#e5d3b3]/60">WAV高音質オーディオ、標準MIDI、JSON楽譜ファイルの保存</p>
          </div>
        </div>

        {downloadSuccess && (
          <div className="flex items-center space-x-2 text-xs text-[#c19a6b] bg-[#1c0f0a] px-3.5 py-1.5 rounded-full border border-[#3d251a]">
            <Check className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span>{downloadSuccess}</span>
          </div>
        )}
      </div>

      {/* Download Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* WAV Download Button */}
        <button
          onClick={handleDownloadWAV}
          disabled={isExportingWav || notes.length === 0}
          className="p-4 rounded-2xl border border-[#c19a6b] bg-[#c19a6b] text-[#1c0f0a] hover:bg-[#d4ac7d] text-left transition-all shadow-md flex items-start space-x-3 cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
        >
          <div className="p-2.5 bg-[#1c0f0a] rounded-xl text-[#c19a6b] shrink-0 mt-0.5">
            {isExportingWav ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#c19a6b]" />
            ) : (
              <FileAudio className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold">WAV 音源保存</span>
              <span className="text-[10px] px-2 py-0.5 bg-[#1c0f0a] text-[#c19a6b] rounded-full uppercase tracking-wider font-mono">
                44.1kHz
              </span>
            </div>
            <p className="text-xs text-[#1c0f0a]/80 mt-1">
              {isExportingWav ? 'Web Audio レンダリング中...' : '高音質リアルタイムオルゴール音声 (.wav)'}
            </p>
          </div>
        </button>

        {/* MIDI Download Button */}
        <button
          onClick={handleDownloadMIDI}
          disabled={notes.length === 0}
          className="p-4 rounded-2xl border border-[#c19a6b] bg-[#1c0f0a] text-[#c19a6b] hover:bg-[#3d251a] text-left transition-all shadow-md flex items-start space-x-3 cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
        >
          <div className="p-2.5 bg-[#2d1b14] rounded-xl border border-[#3d251a] text-[#c19a6b] shrink-0 mt-0.5">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-[#e5d3b3]">MIDI データ保存</span>
              <span className="text-[10px] px-2 py-0.5 bg-[#2d1b14] border border-[#3d251a] text-[#c19a6b] rounded-full font-mono">
                標準.mid
              </span>
            </div>
            <p className="text-xs text-[#e5d3b3]/60 mt-1">
              DTM・各種音楽ソフトで編集可能なMIDIファイル
            </p>
          </div>
        </button>

        {/* JSON Download Button */}
        <button
          onClick={handleDownloadJSON}
          disabled={notes.length === 0}
          className="p-4 rounded-2xl border border-[#3d251a] hover:border-[#c19a6b]/50 bg-[#1c0f0a] text-[#e5d3b3] hover:bg-[#3d251a] text-left transition-all shadow-md flex items-start space-x-3 cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
        >
          <div className="p-2.5 bg-[#2d1b14] rounded-xl border border-[#3d251a] text-[#c19a6b] shrink-0 mt-0.5">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-[#e5d3b3]">楽譜 JSON 保存</span>
              <span className="text-[10px] px-2 py-0.5 bg-[#2d1b14] border border-[#3d251a] text-[#c19a6b] rounded-full font-mono">
                構造データ
              </span>
            </div>
            <p className="text-xs text-[#e5d3b3]/60 mt-1">
              音律・設定パラメーターを含む構造化データ
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
