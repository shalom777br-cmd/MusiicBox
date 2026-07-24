import React, { useState, useMemo } from 'react';
import {
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Music,
  Volume2,
  Wand2,
  Sliders,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { MusicNote, MusicBoxSettings } from '../types';
import { midiToPitchName, MusicBoxAudioEngine } from '../utils/audioEngine';

interface PunchCardEditorProps {
  notes: MusicNote[];
  onChangeNotes: (newNotes: MusicNote[]) => void;
  audioEngine: MusicBoxAudioEngine | null;
  settings: MusicBoxSettings;
}

// Representative pitch scale for Punch Card Editor
const PUNCH_CARD_PITCHES = [
  { midi: 84, name: 'C6' },
  { midi: 83, name: 'B5' },
  { midi: 81, name: 'A5' },
  { midi: 79, name: 'G5' },
  { midi: 77, name: 'F5' },
  { midi: 76, name: 'E5' },
  { midi: 74, name: 'D5' },
  { midi: 72, name: 'C5' },
  { midi: 71, name: 'B4' },
  { midi: 69, name: 'A4' },
  { midi: 67, name: 'G4' },
  { midi: 65, name: 'F4' },
  { midi: 64, name: 'E4' },
  { midi: 62, name: 'D4' },
  { midi: 60, name: 'C4' },
];

export default function PunchCardEditor({
  notes,
  onChangeNotes,
  audioEngine,
  settings,
}: PunchCardEditorProps) {
  const [maxBeatsCount, setMaxBeatsCount] = useState(32); // 8 bars (4 beats each)
  const [activeTab, setActiveTab] = useState<'melody' | 'all'>('all');
  const [page, setPage] = useState(0); // View pagination (16 beats per view)

  const beatsPerPage = 16;
  const totalPages = Math.ceil(maxBeatsCount / beatsPerPage);
  const startBeat = page * beatsPerPage;
  const endBeat = startBeat + beatsPerPage;

  // Map notes by "midi_startTime" for O(1) grid lookup
  const noteGridMap = useMemo(() => {
    const map = new Map<string, MusicNote>();
    notes.forEach((n) => {
      // round to 0.25 beat granularity
      const roundedTime = Math.round(n.startTime * 4) / 4;
      map.set(`${n.midiNumber}_${roundedTime}`, n);
    });
    return map;
  }, [notes]);

  // Handle clicking on a cell on the Punch Card Paper
  const handleCellClick = (midi: number, pitchName: string, beatTime: number) => {
    // 1. Play sound preview instantly when user puts/removes a hole (◯)!
    if (audioEngine) {
      audioEngine.ensureAudioRunning();
      audioEngine.playSingleNote(midi);
    }

    const key = `${midi}_${beatTime}`;
    const existingNote = noteGridMap.get(key);

    if (existingNote) {
      // Remove hole (◯)
      const filtered = notes.filter((n) => n.id !== existingNote.id);
      onChangeNotes(filtered);
    } else {
      // Add hole (◯)
      const newNote: MusicNote = {
        id: `user_note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        pitch: pitchName,
        midiNumber: midi,
        startTime: beatTime,
        duration: 0.5,
        velocity: 95,
        isMelody: true,
      };
      onChangeNotes([...notes, newNote]);
    }
  };

  // Filter top melody notes only
  const handleExtractMelodyOnly = () => {
    // Group notes by startTime and keep only highest pitch note
    const timeGrouped = new Map<number, MusicNote>();
    notes.forEach((n) => {
      const roundedTime = Math.round(n.startTime * 4) / 4;
      const current = timeGrouped.get(roundedTime);
      if (!current || n.midiNumber > current.midiNumber) {
        timeGrouped.set(roundedTime, { ...n, isMelody: true });
      }
    });

    const melodyOnly = Array.from(timeGrouped.values());
    onChangeNotes(melodyOnly);

    // Play a preview sweep of the extracted melody
    if (audioEngine) {
      audioEngine.ensureAudioRunning();
      melodyOnly.slice(0, 5).forEach((note, idx) => {
        setTimeout(() => {
          audioEngine.playSingleNote(note.midiNumber);
        }, idx * 150);
      });
    }
  };

  // Clear all notes
  const handleClearAll = () => {
    if (window.confirm('パンチカードのすべての◯（音符）を消去しますか？')) {
      onChangeNotes([]);
    }
  };

  // Add beats
  const handleAddBeats = () => {
    setMaxBeatsCount((prev) => prev + 16);
  };

  // Play line pitch preview
  const handlePreviewPitch = (midi: number) => {
    if (audioEngine) {
      audioEngine.ensureAudioRunning();
      audioEngine.playSingleNote(midi);
    }
  };

  // Generate beat timestamps array (0.5 beats step = 8th notes)
  const stepBeats: number[] = [];
  for (let b = startBeat; b < endBeat; b += 0.5) {
    stepBeats.push(b);
  }

  return (
    <div className="bg-[#2d1b14] border border-[#3d251a] rounded-[32px] p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#3d251a] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#1c0f0a] border border-[#3d251a] flex items-center justify-center text-[#c19a6b]">
            <Circle className="w-5 h-5 fill-[#c19a6b]" />
          </div>
          <div>
            <h2 className="text-lg font-serif italic text-[#c19a6b]">
              📜 楽譜パンチカード（◯をつけてメロディ作成・編集）
            </h2>
            <p className="text-xs text-[#e5d3b3]/60">
              マス目（◯）をタップするとその音が鳴り、穴あき紙テープ風のメロディを直感的に作成できます
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExtractMelodyOnly}
            className="flex items-center space-x-1.5 text-xs px-3.5 py-2 rounded-full bg-[#3d251a] hover:bg-[#4d3224] text-[#c19a6b] hover:text-[#e5d3b3] border border-[#4d3224] transition-all cursor-pointer"
            title="重なった音から主旋律（メロディ）のみ抽出します"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span>主旋律のみ抽出</span>
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center space-x-1.5 text-xs px-3 py-2 rounded-full bg-[#1c0f0a] hover:bg-red-950/40 text-[#e5d3b3]/60 hover:text-red-300 border border-[#3d251a] transition-all cursor-pointer"
            title="楽譜を全消去"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>全クリア</span>
          </button>
        </div>
      </div>

      {/* Pagination & Time info */}
      <div className="flex items-center justify-between bg-[#1c0f0a] px-4 py-2.5 rounded-2xl border border-[#3d251a] text-xs">
        <div className="flex items-center space-x-2 text-[#c19a6b] font-mono">
          <Music className="w-4 h-4 text-[#c19a6b]" />
          <span>
            小節 {Math.floor(startBeat / 4) + 1} 〜 {Math.floor(endBeat / 4)} / 全 {Math.ceil(maxBeatsCount / 4)} 小節（全 {notes.length} 音）
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-1.5 rounded-lg bg-[#2d1b14] hover:bg-[#3d251a] disabled:opacity-30 border border-[#3d251a] text-[#c19a6b] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-[#e5d3b3]/70">
            {page + 1} / {totalPages} ページ
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="p-1.5 rounded-lg bg-[#2d1b14] hover:bg-[#3d251a] disabled:opacity-30 border border-[#3d251a] text-[#c19a6b] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddBeats}
            className="ml-2 flex items-center space-x-1 px-3 py-1 bg-[#3d251a] hover:bg-[#4d3224] text-[#c19a6b] rounded-lg border border-[#4d3224] text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>小節を追加</span>
          </button>
        </div>
      </div>

      {/* Roll Paper Punch Card Grid Scroll Container */}
      <div className="relative overflow-x-auto rounded-2xl border border-[#3d251a] bg-[#1a0e09] shadow-inner p-3 sm:p-4">
        {/* Craft Paper Background Texture */}
        <div className="min-w-[720px] select-none">
          {/* Timeline Header Bar */}
          <div className="flex items-center mb-2 border-b border-[#3d251a] pb-1">
            <div className="w-16 shrink-0 text-center text-[10px] font-mono text-[#c19a6b]/70 uppercase">
              音階
            </div>
            <div className="flex-1 grid gap-0 text-center text-[10px] font-mono text-[#e5d3b3]/50" style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }}>
              {stepBeats.map((beat) => {
                const isBarStart = beat % 4 === 0;
                const barNum = Math.floor(beat / 4) + 1;
                return (
                  <div
                    key={beat}
                    className={`py-0.5 ${
                      isBarStart
                        ? 'text-[#c19a6b] font-bold border-l border-[#c19a6b]/40'
                        : beat % 1 === 0
                        ? 'border-l border-[#3d251a]/60'
                        : ''
                    }`}
                  >
                    {isBarStart ? `${barNum}小節` : beat % 1 === 0 ? `|` : '•'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Rows for each pitch */}
          <div className="space-y-1">
            {PUNCH_CARD_PITCHES.map(({ midi, name }) => {
              return (
                <div key={midi} className="flex items-center group">
                  {/* Pitch Label & Sound Preview Button */}
                  <button
                    onClick={() => handlePreviewPitch(midi)}
                    className="w-16 shrink-0 px-2 py-1 bg-[#25150f] hover:bg-[#382017] border border-[#3d251a] rounded-l-lg text-[11px] font-mono text-[#c19a6b] flex items-center justify-between cursor-pointer transition-colors group-hover:border-[#c19a6b]/40"
                    title={`${name} の音を試聴`}
                  >
                    <span>{name}</span>
                    <Volume2 className="w-3 h-3 text-[#c19a6b]/60 group-hover:text-[#c19a6b]" />
                  </button>

                  {/* Cell Grid */}
                  <div className="flex-1 grid gap-1 bg-[#22130c] p-1 border border-l-0 border-[#3d251a] rounded-r-lg" style={{ gridTemplateColumns: 'repeat(32, minmax(0, 1fr))' }}>
                    {stepBeats.map((beat) => {
                      const key = `${midi}_${beat}`;
                      const note = noteGridMap.get(key);
                      const isBarStart = beat % 4 === 0;
                      const isBeatStart = beat % 1 === 0;

                      return (
                        <button
                          key={beat}
                          onClick={() => handleCellClick(midi, name, beat)}
                          className={`h-7 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                            note
                              ? 'bg-[#c19a6b] text-[#1c0f0a] shadow-[0_0_10px_rgba(193,154,107,0.6)] border border-[#e5d3b3]'
                              : isBarStart
                              ? 'bg-[#2a1811] hover:bg-[#3d251a] border-l-2 border-l-[#c19a6b]/50 border-y border-r border-[#3d251a]/40'
                              : isBeatStart
                              ? 'bg-[#25150f] hover:bg-[#3d251a] border-l border-l-[#3d251a] border-y border-r border-[#3d251a]/20'
                              : 'bg-[#1e100a] hover:bg-[#351e14] border border-[#2d1b14]/40'
                          }`}
                          title={`${name} (第 ${beat + 1} 拍)`}
                        >
                          {note ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-[#1c0f0a] border-2 border-[#e5d3b3] flex items-center justify-center shadow-inner animate-pulse">
                              <div className="w-1 h-1 rounded-full bg-[#c19a6b]" />
                            </div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3d251a]/40 group-hover:bg-[#c19a6b]/30" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Guide Note */}
      <div className="flex items-center space-x-2 text-xs text-[#e5d3b3]/60 bg-[#1c0f0a] p-3 rounded-xl border border-[#3d251a]">
        <CheckCircle2 className="w-4 h-4 text-[#c19a6b] shrink-0" />
        <span>
          ※ ◯をタップすると音が鳴り、楽譜に自動反映されます。「オルゴール再生」ボタンを押すと、この◯に従って本物のオルゴール音で自動演奏されます。
        </span>
      </div>
    </div>
  );
}
