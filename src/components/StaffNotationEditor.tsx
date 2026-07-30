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
  Save,
  FolderOpen,
  Download,
  Upload,
  Bookmark,
  Check,
  X,
  Mic,
} from 'lucide-react';
import { MusicNote, MusicBoxSettings, ScoreMeta } from '../types';
import { MusicBoxAudioEngine } from '../utils/audioEngine';
import { midiToPitch, pitchToMidi } from '../utils/musicParsers';
import HummingRecorderModal from './HummingRecorderModal';

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

// Preset phrases for quick input (empty)
const SAMPLE_PRESETS: { name: string; notes: MusicNote[] }[] = [];

interface SavedScoreItem {
  id: string;
  title: string;
  savedAt: string;
  notesCount: number;
  notes: MusicNote[];
  measuresCount?: number;
}

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

  // Save / Load state
  const [scoreTitle, setScoreTitle] = useState<string>(meta.title || 'マイオリジナル曲');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [showHummingModal, setShowHummingModal] = useState<boolean>(false);
  const [savedScores, setSavedScores] = useState<SavedScoreItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLoadFromHumming = (newNotes: MusicNote[], newMeta: ScoreMeta) => {
    onChangeNotes(newNotes);
    if (newMeta.title) setScoreTitle(newMeta.title);
    showToast(`「${newMeta.title || '鼻歌のオリジナル曲'}」を五線譜に読み込みました！`);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playbackTimerRef = useRef<number | null>(null);

  // Load saved scores from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('musicbox_saved_scores');
      if (stored) {
        setSavedScores(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse saved scores from localStorage', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Measure calculation: 4 beats per measure
  const beatsPerMeasure = 4;
  const totalBeats = Math.max(measuresCount * beatsPerMeasure, ...notes.map((n) => n.startTime + n.duration + 2));

  // Visual layout constants
  const stepHeight = 7; // pixels per diatonic step
  const lineSpacing = 14; // pixels between staff lines (2 steps)
  const beatWidth = 64; // pixels per beat (quarter note width)
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
        audioEngine.playSingleNote(midi, selectedDuration);
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

  // Save score to LocalStorage Library
  const handleSaveToLocalStorage = () => {
    const titleToSave = scoreTitle.trim() || '無題の楽譜';
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newSavedItem: SavedScoreItem = {
      id: `score_${Date.now()}`,
      title: titleToSave,
      savedAt: formattedDate,
      notesCount: notes.length,
      notes: notes,
      measuresCount: measuresCount,
    };

    // Filter out previous item if exact same title or update
    const filtered = savedScores.filter((s) => s.title !== titleToSave);
    const updated = [newSavedItem, ...filtered];

    setSavedScores(updated);
    try {
      localStorage.setItem('musicbox_saved_scores', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save score to localStorage', e);
    }

    setShowSaveModal(false);
    showToast(`「${titleToSave}」をマイ楽譜に保存しました！`);
  };

  // Load score from LocalStorage
  const handleLoadSavedScore = (item: SavedScoreItem) => {
    onChangeNotes(item.notes);
    if (item.measuresCount) {
      setMeasuresCount(item.measuresCount);
    }
    setScoreTitle(item.title);
    setShowLibraryModal(false);
    showToast(`「${item.title}」を読み込みました！`);
  };

  // Delete saved score
  const handleDeleteSavedScore = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedScores.filter((s) => s.id !== id);
    setSavedScores(updated);
    try {
      localStorage.setItem('musicbox_saved_scores', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to update localStorage', err);
    }
    showToast('マイ楽譜から削除しました');
  };

  // Export score as JSON file
  const handleExportJson = () => {
    const dataToExport = {
      version: '1.0',
      title: scoreTitle || 'マイ楽譜',
      createdAt: new Date().toISOString(),
      measuresCount,
      notes,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(scoreTitle || 'musicbox_score').replace(/[/\\?%*:|"<>]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('楽譜データ (.json) をダウンロードしました！');
  };

  // Import score from JSON file
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.notes)) {
          onChangeNotes(json.notes);
          if (json.measuresCount) setMeasuresCount(json.measuresCount);
          if (json.title) setScoreTitle(json.title);
          showToast(`ファイル「${file.name}」から楽譜を読み込みました！`);
        } else if (Array.isArray(json)) {
          onChangeNotes(json);
          showToast(`ファイルから楽譜を読み込みました！`);
        } else {
          alert('無効な楽譜データ形式です。');
        }
      } catch (err) {
        alert('JSONファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Humming AI Creator Button */}
          <button
            onClick={() => setShowHummingModal(true)}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#e55353] via-[#c19a6b] to-[#d4ac7d] text-white font-extrabold shadow-lg hover:brightness-110 transition-all cursor-pointer transform hover:scale-105"
            title="マイクで鼻歌を歌ってGeminiにオルゴール音符へ変換させます"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>🎤 鼻歌からオルゴール</span>
          </button>

          {/* Save to My Scores Button */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#c19a6b] to-[#d4ac7d] text-[#1c0f0a] font-bold shadow hover:brightness-110 transition-all cursor-pointer"
            title="現在の楽譜をブラウザに保存します"
          >
            <Save className="w-3.5 h-3.5" />
            <span>マイ楽譜に保存</span>
          </button>

          {/* Open Saved Scores Library Button */}
          <button
            onClick={() => setShowLibraryModal(true)}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25150d] border border-[#c19a6b]/60 hover:border-[#c19a6b] text-[#e5d3b3] hover:text-[#d4ac7d] transition-all cursor-pointer font-medium"
            title="保存した楽譜の一覧を開いて読み込みます"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span>マイ楽譜を開く</span>
            {savedScores.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#c19a6b] text-[#1c0f0a] rounded-full text-[10px] font-bold">
                {savedScores.length}
              </span>
            )}
          </button>

          {/* Export JSON Button */}
          <button
            onClick={handleExportJson}
            className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#25150d] border border-[#3d251a] hover:border-[#c19a6b] text-[#e5d3b3]/80 hover:text-[#e5d3b3] transition-all cursor-pointer"
            title="楽譜データをJSONファイルとしてダウンロード保存します"
          >
            <Download className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span className="hidden sm:inline">JSON</span>保存
          </button>

          {/* Import JSON Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#25150d] border border-[#3d251a] hover:border-[#c19a6b] text-[#e5d3b3]/80 hover:text-[#e5d3b3] transition-all cursor-pointer"
            title="保存したJSONファイルを読み込んで楽譜を復元します"
          >
            <Upload className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span className="hidden sm:inline">JSON</span>読込
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportJsonFile}
          />

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
          <div className="flex flex-wrap items-start justify-between gap-3 p-3 bg-[#170c08] border border-[#3d251a] rounded-xl text-xs">
            {/* Left Column: Note Duration & Accidental Selectors */}
            <div className="flex flex-col gap-2.5">
              {/* Note Duration Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#c19a6b] font-semibold flex items-center space-x-1">
                  <Music className="w-3.5 h-3.5" />
                  <span>音符の種類:</span>
                </span>

                <div className="inline-flex flex-wrap items-center rounded-lg bg-[#25150d] p-1 border border-[#3d251a] gap-0.5">
                  {[
                    {
                      duration: 0.5,
                      label: '8分音符 (0.5拍)',
                      name: '8分',
                      icon: (
                        <svg viewBox="0 0 16 20" className="w-3.5 h-4 inline-block shrink-0">
                          <ellipse cx="5" cy="14" rx="3.8" ry="2.6" transform="rotate(-25 5 14)" fill="currentColor" />
                          <line x1="8.2" y1="14" x2="8.2" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M 8.2 2 Q 13 6 8.2 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      ),
                    },
                    {
                      duration: 1,
                      label: '4分音符 (1拍)',
                      name: '4分',
                      icon: (
                        <svg viewBox="0 0 16 20" className="w-3.5 h-4 inline-block shrink-0">
                          <ellipse cx="5" cy="14" rx="3.8" ry="2.6" transform="rotate(-25 5 14)" fill="currentColor" />
                          <line x1="8.2" y1="14" x2="8.2" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ),
                    },
                    {
                      duration: 1.5,
                      label: '付点4分音符 (1.5拍)',
                      name: '付点4分',
                      icon: (
                        <svg viewBox="0 0 18 20" className="w-4 h-4 inline-block shrink-0">
                          <ellipse cx="4.5" cy="14" rx="3.8" ry="2.6" transform="rotate(-25 4.5 14)" fill="currentColor" />
                          <line x1="7.7" y1="14" x2="7.7" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="12.5" cy="14" r="1.3" fill="currentColor" />
                        </svg>
                      ),
                    },
                    {
                      duration: 2,
                      label: '2分音符 (2拍・白抜き幹あり)',
                      name: '2分',
                      icon: (
                        <svg viewBox="0 0 16 20" className="w-3.5 h-4 inline-block shrink-0">
                          <ellipse cx="5" cy="14" rx="3.8" ry="2.6" transform="rotate(-25 5 14)" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <line x1="8.2" y1="14" x2="8.2" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ),
                    },
                    {
                      duration: 3,
                      label: '付点2分音符 (3拍)',
                      name: '付点2分',
                      icon: (
                        <svg viewBox="0 0 18 20" className="w-4 h-4 inline-block shrink-0">
                          <ellipse cx="4.5" cy="14" rx="3.8" ry="2.6" transform="rotate(-25 4.5 14)" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <line x1="7.7" y1="14" x2="7.7" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="12.5" cy="14" r="1.3" fill="currentColor" />
                        </svg>
                      ),
                    },
                    {
                      duration: 4,
                      label: '全音符 (4拍・白抜き幹なし)',
                      name: '全音',
                      icon: (
                        <svg viewBox="0 0 18 20" className="w-4 h-4 inline-block shrink-0">
                          <ellipse cx="9" cy="10" rx="6.5" ry="4.2" fill="currentColor" />
                          <ellipse cx="9" cy="10" rx="3.8" ry="1.8" fill="#25150d" transform="rotate(-35 9 10)" />
                        </svg>
                      ),
                    },
                  ].map((item) => {
                    const isSelected = selectedDuration === item.duration;
                    return (
                      <button
                        key={item.duration}
                        onClick={() => setSelectedDuration(item.duration)}
                        className={`px-2 py-1 rounded-md transition-all font-semibold cursor-pointer text-xs flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-[#c19a6b] text-[#1c0f0a] shadow-sm font-bold'
                            : 'text-[#e5d3b3]/80 hover:text-[#e5d3b3] hover:bg-[#3d251a]'
                        }`}
                        title={item.label}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accidental Selector (Natural, Sharp, Flat) placed directly below */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#c19a6b] font-semibold flex items-center space-x-1">
                  <span>臨時記号:</span>
                </span>
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
            {SAMPLE_PRESETS.length > 0 && (
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
            )}

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

                    {/* Notehead rendering (2分音符 & 全音符 matching standard musical notation) */}
                    {(() => {
                      const hasStem = note.duration < 4;
                      const hasFlag = note.duration <= 0.5;
                      const hasDot = note.duration === 1.5 || note.duration === 3 || note.duration === 6;

                      return (
                        <>
                          {/* Notehead */}
                          {note.duration >= 4 ? (
                            /* 全音符 (Whole Note - Wide outer ellipse + tilted counter hole) */
                            <g transform={`translate(${x}, ${y})`}>
                              <ellipse cx="0" cy="0" rx="8.5" ry="5.5" fill="#2d1b14" />
                              <ellipse cx="0" cy="0" rx="5.0" ry="2.3" fill="#f7f3e9" transform="rotate(-40)" />
                            </g>
                          ) : note.duration >= 2 ? (
                            /* 2分音符 (Half Note - Tilted hollow ellipse with thick border) */
                            <ellipse
                              cx={x}
                              cy={y}
                              rx="6.8"
                              ry="4.5"
                              fill="#f7f3e9"
                              stroke="#2d1b14"
                              strokeWidth="2.5"
                              transform={`rotate(-25 ${x} ${y})`}
                            />
                          ) : (
                            /* 4分音符 / 8分音符 (Quarter / 8th Note - Filled ellipse) */
                            <ellipse
                              cx={x}
                              cy={y}
                              rx="6.5"
                              ry="4.5"
                              fill="#2d1b14"
                              transform={`rotate(-25 ${x} ${y})`}
                            />
                          )}

                          {/* Dot for dotted notes (1.5, 3, 6 beats) */}
                          {hasDot && (
                            <circle
                              cx={x + (note.duration >= 4 ? 11 : 9)}
                              cy={y - 1}
                              r="1.8"
                              fill="#2d1b14"
                            />
                          )}

                          {/* Note Stem (omitted for whole notes >= 4 beats) */}
                          {hasStem && (
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
                          {hasFlag && (
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
                        </>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Hover Preview Ghost Note */}
              {hoverState && editorMode === 'add' && (
                <g opacity="0.6" className="pointer-events-none">
                  {(() => {
                    const x = getBeatX(hoverState.beat);
                    const y = getStepY(hoverState.step);
                    const isStemDown = hoverState.step >= 6;
                    const isHoverHollow = selectedDuration >= 2;
                    const hasHoverStem = selectedDuration < 4;
                    const hasHoverFlag = selectedDuration <= 0.5;
                    const hasHoverDot = selectedDuration === 1.5 || selectedDuration === 3;

                    return (
                      <>
                        {selectedDuration >= 4 ? (
                          /* 全音符 (Whole Note Ghost) */
                          <g transform={`translate(${x}, ${y})`}>
                            <ellipse cx="0" cy="0" rx="8.5" ry="5.5" fill="#c19a6b" />
                            <ellipse cx="0" cy="0" rx="5.0" ry="2.3" fill="#f7f3e9" transform="rotate(-40)" />
                          </g>
                        ) : selectedDuration >= 2 ? (
                          /* 2分音符 (Half Note Ghost) */
                          <ellipse
                            cx={x}
                            cy={y}
                            rx="6.8"
                            ry="4.5"
                            fill="#f7f3e9"
                            stroke="#c19a6b"
                            strokeWidth="2.5"
                            transform={`rotate(-25 ${x} ${y})`}
                          />
                        ) : (
                          /* 4分音符 / 8分音符 (Quarter / 8th Note Ghost) */
                          <ellipse
                            cx={x}
                            cy={y}
                            rx="6.5"
                            ry="4.5"
                            fill="#c19a6b"
                            transform={`rotate(-25 ${x} ${y})`}
                          />
                        )}
                        {hasHoverDot && (
                          <circle
                            cx={x + (selectedDuration >= 4 ? 11 : 9)}
                            cy={y - 1}
                            r="1.8"
                            fill="#c19a6b"
                          />
                        )}
                        {hasHoverStem && (
                          <line
                            x1={isStemDown ? x - 6 : x + 6}
                            y1={y}
                            x2={isStemDown ? x - 6 : x + 6}
                            y2={isStemDown ? y + 26 : y - 26}
                            stroke="#c19a6b"
                            strokeWidth="1.5"
                          />
                        )}
                        {hasHoverFlag && (
                          <path
                            d={
                              isStemDown
                                ? `M ${x - 6} ${y + 26} Q ${x} ${y + 20}, ${x + 6} ${y + 16}`
                                : `M ${x + 6} ${y - 26} Q ${x + 12} ${y - 20}, ${x + 6} ${y - 14}`
                            }
                            fill="none"
                            stroke="#c19a6b"
                            strokeWidth="2"
                          />
                        )}
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-[#e5d3b3]/60 bg-[#170c08] p-2.5 rounded-xl border border-[#3d251a]">
            <span>💡 <strong>使い方:</strong> 五線譜上をクリックすると音符が配置され、音がすぐ鳴ります。消去モードでクリックすると音符を削除できます。</span>
            <span>作成した楽譜は「マイ楽譜に保存」や「JSON保存」でいつでも保管できます</span>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#c19a6b] text-[#1c0f0a] px-4 py-2.5 rounded-xl shadow-2xl border-2 border-[#e5d3b3] font-bold text-sm flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Save Score Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#23130c] border-2 border-[#c19a6b] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-[#e5d3b3]">
            <div className="flex items-center justify-between border-b border-[#c19a6b]/30 pb-3">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-5 h-5 text-[#c19a6b]" />
                <h3 className="font-bold text-lg text-[#e5d3b3]">マイ楽譜に保存</h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-[#e5d3b3]/60 hover:text-[#e5d3b3] p-1 rounded-lg hover:bg-[#3d251a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#c19a6b]">
                曲名・タイトル
              </label>
              <input
                type="text"
                value={scoreTitle}
                onChange={(e) => setScoreTitle(e.target.value)}
                placeholder="例: きらきら星 アレンジ / オリジナル曲 1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#170c08] border border-[#c19a6b]/60 focus:border-[#c19a6b] text-[#e5d3b3] placeholder-[#e5d3b3]/40 outline-none text-sm font-medium"
                autoFocus
              />
              <div className="flex items-center justify-between text-xs text-[#e5d3b3]/70 bg-[#170c08] p-3 rounded-xl border border-[#3d251a]">
                <span>音符数: <strong className="text-[#c19a6b]">{notes.length}</strong> 音</span>
                <span>小節数: <strong className="text-[#c19a6b]">{measuresCount}</strong> 小節</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl bg-[#170c08] border border-[#3d251a] hover:border-[#c19a6b] text-[#e5d3b3]/80 hover:text-[#e5d3b3] text-xs font-semibold cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveToLocalStorage}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#c19a6b] to-[#d4ac7d] text-[#1c0f0a] text-xs font-bold shadow-lg hover:brightness-110 flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>保存する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library / Saved Scores Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#23130c] border-2 border-[#c19a6b] rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 text-[#e5d3b3] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#c19a6b]/30 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-[#c19a6b]" />
                <h3 className="font-bold text-lg text-[#e5d3b3]">保存したマイ楽譜一覧</h3>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="text-[#e5d3b3]/60 hover:text-[#e5d3b3] p-1 rounded-lg hover:bg-[#3d251a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[200px]">
              {savedScores.length === 0 ? (
                <div className="text-center py-12 text-[#e5d3b3]/50 text-sm space-y-2 border border-dashed border-[#3d251a] rounded-xl p-6">
                  <Bookmark className="w-10 h-10 text-[#c19a6b]/30 mx-auto" />
                  <p>保存されたマイ楽譜はありません</p>
                  <p className="text-xs text-[#e5d3b3]/40">
                    五線譜に音符を入力後、「マイ楽譜に保存」ボタンを押すとここに登録されます
                  </p>
                </div>
              ) : (
                savedScores.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadSavedScore(item)}
                    className="p-3.5 rounded-xl bg-[#170c08] border border-[#3d251a] hover:border-[#c19a6b] transition-all flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#e5d3b3] group-hover:text-[#d4ac7d] truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#c19a6b]/20 border border-[#c19a6b]/40 text-[#c19a6b] rounded-full shrink-0 font-semibold">
                          {item.notesCount} 音
                        </span>
                      </div>
                      <div className="text-[11px] text-[#e5d3b3]/50 flex items-center space-x-3">
                        <span>保存日時: {item.savedAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleLoadSavedScore(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#c19a6b] text-[#1c0f0a] font-bold text-xs hover:brightness-110 flex items-center space-x-1"
                        title="この楽譜を開く"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>開く</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSavedScore(item.id, e)}
                        className="p-1.5 rounded-lg text-[#e5d3b3]/50 hover:text-[#e55353] hover:bg-[#3d251a] transition-all"
                        title="この楽譜を削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#c19a6b]/30 flex items-center justify-between shrink-0 text-xs">
              <span className="text-[#e5d3b3]/60">全 {savedScores.length} 曲の楽譜データ</span>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="px-4 py-2 rounded-xl bg-[#170c08] border border-[#3d251a] hover:border-[#c19a6b] text-[#e5d3b3] font-semibold"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Humming Recorder Modal */}
      <HummingRecorderModal
        isOpen={showHummingModal}
        onClose={() => setShowHummingModal(false)}
        onLoadNotes={handleLoadFromHumming}
      />
    </div>
  );
}
