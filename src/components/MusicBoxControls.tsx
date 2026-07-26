import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Music,
  RotateCcw,
  Volume2,
  Wand2,
  Check,
  Disc,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { TimbreType, CombType, MusicBoxSettings, MusicNote } from '../types';

interface MusicBoxControlsProps {
  settings: MusicBoxSettings;
  onUpdateSettings: (newSettings: MusicBoxSettings) => void;
  onPreviewTine: (midi: number) => void;
  onRunAiOptimization: () => void;
  isAiOptimizing: boolean;
  notesCount: number;
}

const TIMBRE_OPTIONS: { id: TimbreType; label: string; desc: string; previewMidi: number; color: string }[] = [
  { id: 'wooden', label: '木製', desc: '丸みのある温かい木のオルゴール体（標準）', previewMidi: 60, color: 'from-orange-950 to-amber-950' },
  { id: 'classic', label: 'クラシック', desc: '伝統的な金属弁と共鳴箱の澄んだ響き', previewMidi: 72, color: 'from-amber-700 to-amber-900' },
];

const COMB_OPTIONS: { count: CombType; label: string; desc: string }[] = [
  { count: 18, label: '18弁 (スタンダード)', desc: '1.5〜2オクターブ。主旋律中心のコンパクトなオルゴール' },
  { count: 30, label: '30弁 (ミディアム)', desc: '2.5オクターブ。繊細なアルペジオ伴奏も再生可能' },
  { count: 50, label: '50弁 (プレミアム)', desc: '3.5オクターブ。豊かな和音とフルスケール表現' },
];

export default function MusicBoxControls({
  settings,
  onUpdateSettings,
  onPreviewTine,
  onRunAiOptimization,
  isAiOptimizing,
  notesCount,
}: MusicBoxControlsProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handleToggle = (key: keyof MusicBoxSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div className="bg-[#2d1b14] border border-[#3d251a] rounded-[32px] p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#3d251a] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#1c0f0a] border border-[#3d251a] flex items-center justify-center text-[#c19a6b]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif italic text-[#c19a6b]">② オルゴール変換＆音色調整</h2>
            <p className="text-xs text-[#e5d3b3]/60">音色 preset・旋律抽出・テンポ・弁数（音域）の設定</p>
          </div>
        </div>

        {/* AI Auto-Optimize Button */}
        <button
          onClick={onRunAiOptimization}
          disabled={isAiOptimizing || notesCount === 0}
          className="flex items-center space-x-2 px-5 py-2.5 bg-[#c19a6b] hover:bg-[#d4ac7d] text-[#1c0f0a] font-bold rounded-full shadow-md transition-all text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
        >
          <Wand2 className={`w-4 h-4 text-[#1c0f0a] ${isAiOptimizing ? 'animate-spin' : ''}`} />
          <span>{isAiOptimizing ? 'AI最適化中...' : 'AI自動最適化'}</span>
        </button>
      </div>

      {/* 1. Timbre / Sound Preset Selection */}
      <div>
        <label className="text-xs font-serif italic text-[#c19a6b] block mb-3 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-[#c19a6b]" />
            <span>音色の選択（オルゴール音源）</span>
          </span>
          <span className="text-[10px] text-[#e5d3b3]/50">※タップして試聴できます</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIMBRE_OPTIONS.map((t) => {
            const isSelected = settings.timbre === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onUpdateSettings({ ...settings, timbre: t.id });
                  onPreviewTine(t.previewMidi);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'border-[#c19a6b] bg-[#c19a6b]/20 text-[#e5d3b3] shadow-md scale-[1.02]'
                    : 'border-[#3d251a] bg-[#1c0f0a] hover:bg-[#3d251a]/40 text-[#e5d3b3]/80 hover:border-[#c19a6b]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#c19a6b]">{t.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#c19a6b]" />}
                </div>
                <p className="text-[10px] text-[#e5d3b3]/60 mt-1 line-clamp-2">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Musical Simplification Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => handleToggle('removeChords')}
          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
            settings.removeChords
              ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] shadow-sm'
              : 'bg-[#1c0f0a] border-[#3d251a] text-[#e5d3b3]/70 hover:border-[#c19a6b]/40'
          }`}
        >
          <div className="text-left">
            <span className="text-xs font-medium block text-[#e5d3b3]">主旋律のみ抽出</span>
            <span className="text-[10px] text-[#e5d3b3]/50 block">密集した和音を整理</span>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.removeChords ? 'bg-[#c19a6b]' : 'bg-[#3d251a]'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-[#1c0f0a] rounded-full transition-all ${settings.removeChords ? 'right-1' : 'left-1'}`} />
          </div>
        </button>

        <button
          onClick={() => handleToggle('removeBass')}
          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
            settings.removeBass
              ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] shadow-sm'
              : 'bg-[#1c0f0a] border-[#3d251a] text-[#e5d3b3]/70 hover:border-[#c19a6b]/40'
          }`}
        >
          <div className="text-left">
            <span className="text-xs font-medium block text-[#e5d3b3]">左手伴奏・低音カット</span>
            <span className="text-[10px] text-[#e5d3b3]/50 block">重いベース音階を除外</span>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.removeBass ? 'bg-[#c19a6b]' : 'bg-[#3d251a]'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-[#1c0f0a] rounded-full transition-all ${settings.removeBass ? 'right-1' : 'left-1'}`} />
          </div>
        </button>

        <button
          onClick={() => handleToggle('simplifyTrills')}
          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
            settings.simplifyTrills
              ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] shadow-sm'
              : 'bg-[#1c0f0a] border-[#3d251a] text-[#e5d3b3]/70 hover:border-[#c19a6b]/40'
          }`}
        >
          <div className="text-left">
            <span className="text-xs font-medium block text-[#e5d3b3]">トリル・装飾音省略</span>
            <span className="text-[10px] text-[#e5d3b3]/50 block">連打衝突を防止</span>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.simplifyTrills ? 'bg-[#c19a6b]' : 'bg-[#3d251a]'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-[#1c0f0a] rounded-full transition-all ${settings.simplifyTrills ? 'right-1' : 'left-1'}`} />
          </div>
        </button>

        <button
          onClick={() => handleToggle('relaxationMode')}
          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
            settings.relaxationMode
              ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] shadow-sm'
              : 'bg-[#1c0f0a] border-[#3d251a] text-[#e5d3b3]/70 hover:border-[#c19a6b]/40'
          }`}
        >
          <div className="text-left">
            <span className="text-xs font-medium block text-[#e5d3b3]">癒やしモード</span>
            <span className="text-[10px] text-[#e5d3b3]/50 block">ゆったりテンポ＆深い余韻</span>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.relaxationMode ? 'bg-[#c19a6b]' : 'bg-[#3d251a]'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-[#1c0f0a] rounded-full transition-all ${settings.relaxationMode ? 'right-1' : 'left-1'}`} />
          </div>
        </button>
      </div>

      {/* 3. Comb Teeth Range (弁数設定) */}
      <div>
        <label className="text-xs font-serif italic text-[#c19a6b] block mb-2.5 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#c19a6b]" />
          <span>オルゴール弁数（音域制限）: {settings.combCount}弁</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {COMB_OPTIONS.map((c) => {
            const isSelected = settings.combCount === c.count;
            return (
              <button
                key={c.count}
                onClick={() => onUpdateSettings({ ...settings, combCount: c.count })}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] shadow-sm'
                    : 'bg-[#1c0f0a] border-[#3d251a] text-[#e5d3b3]/70 hover:border-[#c19a6b]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#c19a6b]">{c.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#c19a6b]" />}
                </div>
                <p className="text-[10px] text-[#e5d3b3]/50 mt-1">{c.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Sliders: Tempo, Pitch Transposition, Reverb, Mechanical Noise */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Tempo Slider */}
        <div className="space-y-2 bg-[#1c0f0a] p-3.5 rounded-2xl border border-[#3d251a]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#e5d3b3] font-medium flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#c19a6b]" />
              <span>再生テンポ (BPM)</span>
            </span>
            <span className="font-mono text-[#c19a6b] font-bold">{settings.tempoBpm} BPM</span>
          </div>
          <input
            type="range"
            min="35"
            max="140"
            value={settings.tempoBpm}
            onChange={(e) => onUpdateSettings({ ...settings, tempoBpm: parseInt(e.target.value, 10) })}
            className="w-full accent-[#c19a6b] cursor-pointer h-1.5 bg-[#2d1b14] rounded-lg"
          />
        </div>

        {/* Pitch Transposition Slider */}
        <div className="space-y-2 bg-[#1c0f0a] p-3.5 rounded-2xl border border-[#3d251a]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#e5d3b3] font-medium flex items-center space-x-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-[#c19a6b]" />
              <span>キー移調 (Transposition)</span>
            </span>
            <span className="font-mono text-[#c19a6b] font-bold">
              {settings.keyShift > 0 ? `+${settings.keyShift}` : settings.keyShift} 半音
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            value={settings.keyShift}
            onChange={(e) => onUpdateSettings({ ...settings, keyShift: parseInt(e.target.value, 10) })}
            className="w-full accent-[#c19a6b] cursor-pointer h-1.5 bg-[#2d1b14] rounded-lg"
          />
        </div>

        {/* Reverb Level Slider & Gear Noise */}
        <div className="space-y-2 bg-[#1c0f0a] p-3.5 rounded-2xl border border-[#3d251a]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#e5d3b3] font-medium flex items-center space-x-1.5">
              <Disc className="w-3.5 h-3.5 text-[#c19a6b]" />
              <span>空間残響 (Reverb)</span>
            </span>
            <span className="font-mono text-[#c19a6b] font-bold">
              {Math.round(settings.reverbLevel * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.reverbLevel}
            onChange={(e) => onUpdateSettings({ ...settings, reverbLevel: parseFloat(e.target.value) })}
            className="w-full accent-[#c19a6b] cursor-pointer h-1.5 bg-[#2d1b14] rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
