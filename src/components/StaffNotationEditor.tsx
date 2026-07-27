import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Undo2,
  Sparkles,
  Volume2,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MusicNote, MusicBoxSettings, ScoreMeta } from '../types';
import { MusicBoxAudioEngine } from '../utils/audioEngine';
import { midiToPitch, pitchToMidi } from '../utils/musicParsers';

interface StaffNotationEditorProps {
  notes: MusicNote[];
  onChangeNotes: (updatedNotes: MusicNote[]) => void;
  audioEngine: MusicBoxAudioEngine | null;
  settings: MusicBoxSettings;
  meta: ScoreMeta;
}

// Diatonic steps: C4=0, D4=1, E4=2(Line1), F4=3, G4=4(Line2), A4=5, B4=6(Line3),
// C5=7, D5=8(Line4), E5=9, F5=10(Line5), G5=11, A5=12, B5=13, C6=14
function midiToStaffInfo(midi: number): { step: number; accidental: '' | '#' | 'b' } {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = ((midi % 12) + 12) % 12;

  const map: { step: number; accidental: '' | '#' }[] = [
    { step: 0, accidental: '' },  // C
    { step: 0, accidental: '#' }, // C#
    { step: 1, accidental: '' },  // D
    { step: 1, accidental: '#' }, // D#
    { step: 2, accidental: '' },  // E
    { step: 3, accidental: '' },  // F
    { step: 3, accidental: '#' }, // F#
    { step: 4, accidental: '' },  // G
    { step: 4, accidental: '#' }, // G#
    { step: 5, accidental: '' },  // A
    { step: 5, accidental: '#' }, // A#
    { step: 6, accidental: '' },  // B
  ];

  const info = map[semitone] || { step: 0, accidental: '' };
  const step = (octave - 4) * 7 + info.step;
  return { step, accidental: info.accidental };
}

function staffStepToPitch(step: number, accidental: '' | '#' | 'b' = ''): { midi: number; pitch: string; japaneseName: string } {
  const octave = Math.floor(step / 7) + 4;
  const stepInOctave = ((step % 7) + 7) % 7; // 0..6

  const baseNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const baseJap = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'];
  const baseMidis = [0, 2, 4, 5, 7, 9, 11];

  let semitone = baseMidis[stepInOctave];
  let name = baseNames[stepInOctave];
  let jName = baseJap[stepInOctave];

  if (accidental === '#') {
    semitone += 1;
    name += '#';
    jName += '♯';
  } else if (accidental === 'b') {
    semitone -= 1;
    name += 'b';
    jName += '♭';
  }

  const midi = (octave + 1) * 12 + semitone;
  const pitch = `${name}${octave}`;
  return { midi, pitch, japaneseName: `${jName}${octave}` };
}

// Preset phrases for quick input
const SAMPLE_PRESETS = [
  {
    name: 'ドレミファソラシド ( Scale )',
    notes: [
      { id: 'p1', pitch: 'C4', midiNumber: 60, startTime: 0, duration: 1 },
      { id: 'p2', pitch: 'D4', midiNumber: 62, startTime: 1, duration: 1 },
      { id: 'p3', pitch: 'E4', midiNumber: 64, startTime: 2, duration: 1 },
      { id: 'p4', pitch: 'F4', midiNumber: 65, startTime: 3, duration: 1 },
      { id: 'p5', pitch: 'G4', midiNumber: 67, startTime: 4, duration: 1 },
      { id: 'p6', pitch: 'A4', midiNumber: 69, startTime: 5, duration: 1 },
      { id: 'p7', pitch: 'B4', midiNumber: 71, startTime: 6, duration: 1 },
      { id: 'p8', pitch: 'C5', midiNumber: 72, startTime: 7, duration: 1 },
    ],
  },
  {
    name: 'キラキラ星 ( Twinkle Star )',
    notes: [
      { id: 't1', pitch: 'C4', midiNumber: 60, startTime: 0, duration: 1 },
      { id: 't2', pitch: 'C4', midiNumber: 60, startTime: 1, duration: 1 },
      { id: 't3', pitch: 'G4', midiNumber: 67, startTime: 2, duration: 1 },
      { id: 't4', pitch: 'G4', midiNumber: 67, startTime: 3, duration: 1 },
      { id: 't5', pitch: 'A4', midiNumber: 69, startTime: 4, duration: 1 },
      { id: 't6', pitch: 'A4', midiNumber: 69, startTime: 5, duration: 1 },
      { id: 't7', pitch: 'G4', midiNumber: 67, startTime: 6, duration: 2 },
      { id: 't8', pitch: 'F4', midiNumber: 65, startTime: 8, duration: 1 },
      { id: 't9', pitch: 'F4', midiNumber: 65, startTime: 9, duration: 1 },
      { id: 't10', pitch: 'E4', midiNumber: 64, startTime: 10, duration: 1 },
      { id: 't11', pitch: 'E4', midiNumber: 64, startTime: 11, duration: 1 },
      { id: 't12', pitch: 'D4', midiNumber: 62, startTime: 12, duration: 1 },
      { id: 't13', pitch: 'D4', midiNumber: 62, startTime: 13, duration: 1 },
      { id: 't14', pitch: 'C4', midiNumber: 60, startTime: 14, duration: 2 },
    ],
  },
];

export default function StaffNotationEditor({
  notes,
  onChangeNotes,
  audioEngine,
  settings,
  meta,
}: StaffNotationEditorProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // 1 beat = quarter note
  const [selectedAccidental, setSelectedAccidental] = useState<'' | '#' | 'b'>('');
  const [editorMode, setEditorMode] = useState<'add' | 'delete'>('add');
  const [measuresCount, setMeasuresCount] = useState<number>(8); // 8 measures by default (32 beats)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackBeat, setPlaybackBeat] = useState<number>(-1);
  const [hoverState, setHoverState] = useState<{ step: number; beat: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playbackTimerRef = useRef<number | null>(null);

  // Measure calculation: 4 beats per measure
  const beatsPerMeasure = 4;
  const totalBeats = Math.max(measuresCount * beatsPerMeasure, ...notes.map((n) => n.startTime + n.duration + 2));

  // Visual layout constants
  const stepHeight = 7; // pixels per diatonic step
  const lineSpacing = 14; // pixels between staff lines (2 steps)
  const beatWidth = 36; // pixels per beat (quarter note width)
  const staffLeftMargin = 80; // space for Treble Clef and time signature
  const staffPaddingTop = 70; // padding top for ledger lines above F5/C6
  const staffHeight = 180; // total staff height

  // Line 1 (E4) Y-position
  const yBaseE4 = staffPaddingTop + 70;

  // Y coordinate calculation for a step
  const getStepY = (step: number) => yBaseE4 - (step - 2) * stepHeight;

  // X coordinate calculation for a beat
  const getBeatX = (beat: number) => staffLeftMargin + beat * beatWidth;

  // Clean playback interval on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) window.clearInterval(playbackTimerRef.current);
    };
  }, []);

  // Handle clicking on staff canvas to place or remove a note
  const handleStaffClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - svgRect.left;
    const clickY = e.clientY - svgRect.top;

    // Calculate nearest beat
    const rawBeat = (clickX - staffLeftMargin) / beatWidth;
    if (rawBeat < 0) return; // clicked in clef region

    // Snap to 0.5 beat (8th note) grid
    const snappedBeat = Math.max(0, Math.round(rawBeat * 2) / 2);

    // Calculate diatonic step from Y coordinate
    // y = yBaseE4 - (step - 2) * stepHeight => step = 2 + (yBaseE4 - y) / stepHeight
    const rawStep = 2 + (yBaseE4 - clickY) / stepHeight;
    const snappedStep = Math.min(16, Math.max(-2, Math.round(rawStep))); // constrain between A3 and D6

    const { midi, pitch, japaneseName } = staffStepToPitch(snappedStep, selectedAccidental);

    if (editorMode === 'delete') {
      // Find note at or near beat and step to delete
      const updated = notes.filter((n) => {
        const info = midiToStaffInfo(n.midiNumber);
        const sameStep = Math.abs(info.step - snappedStep) <= 0.5;
        const sameBeat = Math.abs(n.startTime - snappedBeat) < 0.4;
        return !(sameStep && sameBeat);
      });
      onChangeNotes(updated);
    } else {
      // Add or Update Note
      // Play sound immediately on click for acoustic feedback
      if (audioEngine) {
        audioEngine.unlockAudio();
        audioEngine.playSingleNote(midi);
      }

      // Check if a note already exists at this exact beat & step
      const existingIndex = notes.findIndex((n) => {
        const info = midiToStaffInfo(n.midiNumber);
        return Math.abs(info.step - snappedStep) <= 0.5 && Math.abs(n.startTime - snappedBeat) < 0.4;
      });

      const newNote: MusicNote = {
        id: `staff_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        pitch,
        midiNumber: midi,
        startTime: snappedBeat,
        duration: selectedDuration,
      };

      if (existingIndex >= 0) {
        // Toggle/replace
        const updated = [...notes];
        updated[existingIndex] = newNote;
        onChangeNotes(updated);
      } else {
        // Append and sort by startTime
        const updated = [...notes, newNote].sort((a, b) => a.startTime - b.startTime);
        onChangeNotes(updated);
      }
    }
  };

  // Mouse move on staff for hover guide
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    const rawBeat = (mouseX - staffLeftMargin) / beatWidth;
    if (rawBeat < 0) {
      setHoverState(null);
      return;
    }

    const snappedBeat = Math.max(0, Math.round(rawBeat * 2) / 2);
    const rawStep = 2 + (yBaseE4 - mouseY) / stepHeight;
    const snappedStep = Math.min(16, Math.max(-2, Math.round(rawStep)));

    setHoverState({ step: snappedStep, beat: snappedBeat });
  };

  const handleMouseLeave = () => {
    setHoverState(null);
  };

  // Play staff notes sequentially
  const handleTogglePlay = () => {
    if (isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setIsPlaying(false);
      setPlaybackBeat(-1);
      return;
    }

    if (notes.length === 0) return;

    if (audioEngine) {
      audioEngine.unlockAudio();
    }

    setIsPlaying(true);
    let currentB = 0;
    const bpm = settings.tempoBpm || 66;
    const msPerBeat = (60 / bpm) * 1000;
    const stepInterval = msPerBeat / 4; // 16th note resolution

    playbackTimerRef.current = window.setInterval(() => {
      setPlaybackBeat(currentB);

      // Trigger notes starting around currentB
      notes.forEach((n) => {
        if (Math.abs(n.startTime - currentB) < 0.12) {
          if (audioEngine) {
            audioEngine.playSingleNote(n.midiNumber);
          }
        }
      });

      currentB += 0.25;

      if (currentB > totalBeats) {
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        setIsPlaying(false);
        setPlaybackBeat(-1);
      }
    }, stepInterval);
  };

  const handleUndo = () => {
    if (notes.length === 0) return;
    // Remove the last note in array
    const updated = notes.slice(0, notes.length - 1);
    onChangeNotes(updated);
    setConfirmClear(false);
  };

  const handleClearAll = () => {
    if (notes.length === 0) return;
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onChangeNotes([]);
    setConfirmClear(false);
  };

  const handleLoadPreset = (presetNotes: MusicNote[]) => {
    const formatted = presetNotes.map((n, i) => ({
      ...n,
      id: `preset_${i}_${Date.now()}`,
    }));
    onChangeNotes(formatted);
  };

  const hoverPitchInfo = useMemo(() => {
    if (!hoverState) return null;
    return staffStepToPitch(hoverState.step, selectedAccidental);
  }, [hoverState, selectedAccidental]);

  return (
    <div className="w-full bg-gradient-to-b from-[#2a1810] via-[#23130c] to-[#1c0f0a] border-2 border-[#c19a6b] rounded-2xl shadow-2xl overflow-hidden transition-all">
      {/* Editor Header Banner */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-[#3d251a] via-[#4a2e20] to-[#3d251a] border-b border-[#c19a6b]/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c19a6b] to-[#8c6738] text-[#1c0f0a] flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            🎼
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-[#e5d3b3] tracking-wide">
                インタラクティブ五線譜エディタ
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-[#c19a6b]/20 border border-[#c19a6b]/50 text-[#d4ac7d] rounded-full font-semibold">
                簡単1音ずつ入力
              </span>
            </div>
            <p className="text-xs text-[#e5d3b3]/70">
              五線譜上を直接クリックして音符（ドレミ）を1音ずつポチポチ入力・編集できます
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-[#1c0f0a] border border-[#c19a6b]/50 hover:border-[#c19a6b] text-[#e5d3b3] transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>折りたたむ</span>
                <ChevronUp className="w-4 h-4 text-[#c19a6b]" />
              </>
            ) : (
              <>
                <span>五線譜を開く</span>
                <ChevronDown className="w-4 h-4 text-[#c19a6b]" />
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-5 space-y-4">
          {/* Tool Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#170c08] border border-[#3d251a] rounded-xl text-xs">
            {/* Note Duration Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#c19a6b] font-semibold flex items-center space-x-1">
                <Music className="w-3.5 h-3.5" />
                <span>音符の種類:</span>
              </span>

              <div className="inline-flex rounded-lg bg-[#25150d] p-1 border border-[#3d251a]">
                {[
                  { duration: 1, label: '♩ 4分音符 (1拍)', symbol: '♩' },
                  { duration: 0.5, label: '♪ 8分音符 (0.5拍)', symbol: '♪' },
                  { duration: 2, label: '𝅗𝅥 2分音符 (2拍)', symbol: '𝅗𝅥' },
                  { duration: 4, label: '𝅝 全音符 (4拍)', symbol: '𝅝' },
                ].map((item) => (
                  <button
                    key={item.duration}
                    onClick={() => setSelectedDuration(item.duration)}
                    className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                      selectedDuration === item.duration
                        ? 'bg-[#c19a6b] text-[#1c0f0a] shadow-sm'
                        : 'text-[#e5d3b3]/80 hover:text-[#e5d3b3] hover:bg-[#3d251a]'
                    }`}
                    title={item.label}
                  >
                    {item.symbol} {item.duration === 1 ? '4分' : item.duration === 0.5 ? '8分' : item.duration === 2 ? '2分' : '全音'}
                  </button>
                ))}
              </div>
            </div>

            {/* Accidental Selector (Natural, Sharp, Flat) */}
            <div className="flex items-center space-x-2">
              <span className="text-[#c19a6b] font-semibold">臨時記号:</span>
              <div className="inline-flex rounded-lg bg-[#25150d] p-1 border border-[#3d251a]">
                {[
                  { acc: '' as const, label: '♮ ナチュラル' },
                  { acc: '#' as const, label: '♯ シャープ' },
                  { acc: 'b' as const, label: '♭ フラット' },
                ].map((item) => (
                  <button
                    key={item.acc || 'nat'}
                    onClick={() => setSelectedAccidental(item.acc)}
                    className={`px-2 py-1 rounded-md transition-all font-bold cursor-pointer ${
                      selectedAccidental === item.acc
                        ? 'bg-[#c19a6b] text-[#1c0f0a]'
                        : 'text-[#e5d3b3]/70 hover:text-[#e5d3b3] hover:bg-[#3d251a]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selector (Add / Delete) */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex rounded-lg bg-[#25150d] p-1 border border-[#3d251a]">
                <button
                  onClick={() => setEditorMode('add')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1 font-medium cursor-pointer ${
                    editorMode === 'add'
                      ? 'bg-[#c19a6b] text-[#1c0f0a] font-bold shadow'
                      : 'text-[#e5d3b3]/70 hover:text-[#e5d3b3]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>音符追加</span>
                </button>
                <button
                  onClick={() => setEditorMode('delete')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1 font-medium cursor-pointer ${
                    editorMode === 'delete'
                      ? 'bg-[#e55353] text-white font-bold shadow'
                      : 'text-[#e5d3b3]/70 hover:text-[#e5d3b3]'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>音符消去</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions & Playback Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Playback & Reset */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTogglePlay}
                disabled={notes.length === 0}
                className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-1.5 shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-40 ${
                  isPlaying
                    ? 'bg-[#e55353] text-white'
                    : 'bg-gradient-to-r from-[#c19a6b] to-[#d4ac7d] text-[#1c0f0a]'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>停止</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>五線譜を再生</span>
                  </>
                )}
              </button>

              {/* Undo / Remove last note button */}
              <button
                onClick={handleUndo}
                disabled={notes.length === 0}
                className="px-3 py-2 rounded-xl bg-[#25150d] border border-[#c19a6b]/50 hover:border-[#c19a6b] text-[#e5d3b3] hover:text-[#d4ac7d] transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 font-medium"
                title="最後に追加した音符を1つ消去して元に戻します"
              >
                <Undo2 className="w-3.5 h-3.5 text-[#c19a6b]" />
                <span>1音消去 (戻す)</span>
              </button>

              {/* Clear All Notes Button */}
              <button
                onClick={handleClearAll}
                disabled={notes.length === 0}
                className={`px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 font-medium ${
                  confirmClear
                    ? 'bg-[#e55353] text-white border border-[#e55353] font-bold shadow-md animate-pulse'
                    : 'bg-[#25150d] border border-[#3d251a] hover:border-[#e55353] text-[#e5d3b3]/80 hover:text-[#e55353]'
                }`}
                title="五線譜のすべての音符を削除します"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{confirmClear ? '本当に全消去する？' : '全クリア'}</span>
              </button>
            </div>

            {/* Quick Preset Pickers */}
            <div className="flex items-center space-x-2 overflow-x-auto py-1">
              <span className="text-[#c19a6b] text-[11px] whitespace-nowrap">サンプル配置:</span>
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleLoadPreset(preset.notes)}
                  className="px-2.5 py-1 rounded-lg bg-[#25150d] border border-[#c19a6b]/30 hover:border-[#c19a6b] text-[#e5d3b3] hover:text-[#d4ac7d] transition-all whitespace-nowrap cursor-pointer text-[11px] flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-[#c19a6b]" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Measure Count Controls */}
            <div className="flex items-center space-x-1.5 text-[#e5d3b3]/80">
              <span>小節数: {measuresCount}</span>
              <button
                onClick={() => setMeasuresCount((m) => Math.max(2, m - 2))}
                className="w-6 h-6 rounded bg-[#25150d] border border-[#3d251a] hover:border-[#c19a6b] text-[#c19a6b] flex items-center justify-center font-bold"
              >
                -
              </button>
              <button
                onClick={() => setMeasuresCount((m) => m + 2)}
                className="w-6 h-6 rounded bg-[#25150d] border border-[#3d251a] hover:border-[#c19a6b] text-[#c19a6b] flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Hover Pitch Information Badge */}
          <div className="h-6 flex items-center justify-between text-xs px-2 text-[#c19a6b]">
            <div className="flex items-center space-x-2">
              <Info className="w-3.5 h-3.5" />
              {hoverPitchInfo ? (
                <span className="font-bold text-[#e5d3b3]">
                  カーソル位置: <span className="text-[#d4ac7d]">{hoverPitchInfo.japaneseName}</span> ({hoverPitchInfo.pitch}) - 第{Math.floor((hoverState?.beat || 0) / 4) + 1}小節 {((hoverState?.beat || 0) % 4) + 1}拍目
                </span>
              ) : (
                <span className="text-[#e5d3b3]/60">五線譜の上にマウス・指を置くと音名が表示され、クリックで音符を配置できます</span>
              )}
            </div>
            <div className="text-[11px] text-[#e5d3b3]/60">
              現在の音符数: <strong className="text-[#c19a6b]">{notes.length}</strong> 音
            </div>
          </div>

          {/* Staff Sheet Canvas SVG Area */}
          <div
            ref={containerRef}
            className="w-full overflow-x-auto bg-[#faf5eb] rounded-xl border-2 border-[#c19a6b] shadow-inner select-none relative"
            style={{
              backgroundImage: 'radial-gradient(#e2d5c3 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            <svg
              width={staffLeftMargin + totalBeats * beatWidth + 60}
              height={staffHeight}
              onClick={handleStaffClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className={`cursor-${editorMode === 'delete' ? 'crosshair' : 'pointer'} block`}
            >
              {/* Background Margins & Clef Area */}
              <rect
                x="0"
                y="0"
                width={staffLeftMargin}
                height={staffHeight}
                fill="#f2e8d8"
                opacity="0.8"
              />
              <line
                x1={staffLeftMargin}
                y1="0"
                x2={staffLeftMargin}
                y2={staffHeight}
                stroke="#c19a6b"
                strokeWidth="2"
              />

              {/* Treble Clef 🎼 Vector Symbol */}
              <text
                x="18"
                y={yBaseE4 - 8}
                fontSize="52"
                fontFamily="serif"
                fill="#2d1b14"
                className="pointer-events-none select-none"
              >
                🎼
              </text>

              {/* Time Signature (4/4) */}
              <g transform={`translate(${staffLeftMargin - 22}, ${yBaseE4 - 24})`} className="pointer-events-none">
                <text x="0" y="0" fontSize="16" fontWeight="bold" fill="#2d1b14" fontFamily="serif">
                  4
                </text>
                <text x="0" y="16" fontSize="16" fontWeight="bold" fill="#2d1b14" fontFamily="serif">
                  4
                </text>
              </g>

              {/* 5 Main Staff Lines */}
              {/* Line 1: E4 (yBaseE4), Line 2: G4, Line 3: B4, Line 4: D5, Line 5: F5 */}
              {[2, 4, 6, 8, 10].map((step) => {
                const y = getStepY(step);
                return (
                  <line
                    key={`staff_line_${step}`}
                    x1={staffLeftMargin}
                    y1={y}
                    x2={staffLeftMargin + totalBeats * beatWidth + 40}
                    y2={y}
                    stroke="#3d251a"
                    strokeWidth="1.5"
                    opacity="0.85"
                  />
                );
              })}

              {/* Measure Bar Lines & Beat Markers */}
              {Array.from({ length: totalBeats + 1 }).map((_, beatIndex) => {
                const x = getBeatX(beatIndex);
                const isMeasureBar = beatIndex % beatsPerMeasure === 0;

                return (
                  <g key={`beat_marker_${beatIndex}`}>
                    {/* Vertical Measure Line */}
                    {isMeasureBar && (
                      <>
                        <line
                          x1={x}
                          y1={getStepY(10)}
                          x2={x}
                          y2={getStepY(2)}
                          stroke="#2d1b14"
                          strokeWidth={beatIndex === 0 ? '2.5' : '1.5'}
                        />
                        {/* Measure Number */}
                        <text
                          x={x + 4}
                          y={getStepY(10) - 10}
                          fontSize="10"
                          fontWeight="bold"
                          fill="#8c6738"
                          className="pointer-events-none"
                        >
                          {beatIndex / beatsPerMeasure + 1}
                        </text>
                      </>
                    )}

                    {/* Subtle beat grid tick */}
                    {!isMeasureBar && (
                      <line
                        x1={x}
                        y1={getStepY(10)}
                        x2={x}
                        y2={getStepY(2)}
                        stroke="#c19a6b"
                        strokeWidth="1"
                        strokeDasharray="2,3"
                        opacity="0.4"
                      />
                    )}
                  </g>
                );
              })}

              {/* Playback Position Tracker Line */}
              {playbackBeat >= 0 && (
                <line
                  x1={getBeatX(playbackBeat)}
                  y1={0}
                  x2={getBeatX(playbackBeat)}
                  y2={staffHeight}
                  stroke="#e55353"
                  strokeWidth="2.5"
                  className="transition-all duration-75"
                />
              )}

              {/* Render Existing Placed Notes */}
              {notes.map((note) => {
                const { step, accidental } = midiToStaffInfo(note.midiNumber);
                const x = getBeatX(note.startTime);
                const y = getStepY(step);
                const isStemDown = step >= 6; // Stem goes down for B4 (step 6) and above

                // Ledger Lines
                const ledgerLines = [];
                if (step <= 0) {
                  // C4 or lower
                  for (let s = 0; s >= step; s -= 2) {
                    ledgerLines.push(getStepY(s));
                  }
                } else if (step >= 12) {
                  // A5 or higher
                  for (let s = 12; s <= step; s += 2) {
                    ledgerLines.push(getStepY(s));
                  }
                }

                return (
                  <g
                    key={note.id}
                    className="transition-transform hover:scale-110 cursor-pointer"
                    title={`${note.pitch} (${note.startTime}拍目)`}
                  >
                    {/* Render Ledger Lines if applicable */}
                    {ledgerLines.map((ly, idx) => (
                      <line
                        key={`ledger_${note.id}_${idx}`}
                        x1={x - 10}
                        y1={ly}
                        x2={x + 10}
                        y2={ly}
                        stroke="#2d1b14"
                        strokeWidth="1.5"
                      />
                    ))}

                    {/* Accidental (# / b) */}
                    {accidental && (
                      <text
                        x={x - 14}
                        y={y + 4}
                        fontSize="14"
                        fontWeight="bold"
                        fill="#2d1b14"
                        className="pointer-events-none"
                      >
                        {accidental === '#' ? '♯' : '♭'}
                      </text>
                    )}

                    {/* Notehead Oval */}
                    <ellipse
                      cx={x}
                      cy={y}
                      rx="6.5"
                      ry="4.5"
                      fill="#2d1b14"
                      transform={`rotate(-20 ${x} ${y})`}
                    />

                    {/* Note Stem (for 4th, 8th, 2nd notes) */}
                    {note.duration < 4 && (
                      <line
                        x1={isStemDown ? x - 6 : x + 6}
                        y1={y}
                        x2={isStemDown ? x - 6 : x + 6}
                        y2={isStemDown ? y + 26 : y - 26}
                        stroke="#2d1b14"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Flag for 8th note */}
                    {note.duration <= 0.5 && (
                      <path
                        d={
                          isStemDown
                            ? `M ${x - 6} ${y + 26} Q ${x} ${y + 20}, ${x + 6} ${y + 16}`
                            : `M ${x + 6} ${y - 26} Q ${x + 12} ${y - 20}, ${x + 6} ${y - 14}`
                        }
                        fill="none"
                        stroke="#2d1b14"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              })}

              {/* Hover Preview Ghost Note */}
              {hoverState && editorMode === 'add' && (
                <g opacity="0.5" className="pointer-events-none">
                  {(() => {
                    const x = getBeatX(hoverState.beat);
                    const y = getStepY(hoverState.step);
                    const isStemDown = hoverState.step >= 6;

                    return (
                      <>
                        <ellipse
                          cx={x}
                          cy={y}
                          rx="6.5"
                          ry="4.5"
                          fill="#c19a6b"
                          transform={`rotate(-20 ${x} ${y})`}
                        />
                        <line
                          x1={isStemDown ? x - 6 : x + 6}
                          y1={y}
                          x2={isStemDown ? x - 6 : x + 6}
                          y2={isStemDown ? y + 26 : y - 26}
                          stroke="#c19a6b"
                          strokeWidth="1.5"
                        />
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-[#e5d3b3]/60 bg-[#170c08] p-2.5 rounded-xl border border-[#3d251a]">
            <span>💡 <strong>使い方:</strong> 五線譜上をクリックすると音符が配置され、音がすぐ鳴ります。消去モードでクリックすると音符を削除できます。</span>
            <span>作成した楽譜は下部のオルゴールプレイヤー・パンチカードと自動同期されます</span>
          </div>
        </div>
      )}
    </div>
  );
}
