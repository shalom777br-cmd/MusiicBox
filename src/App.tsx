import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import ScoreUpload from './components/ScoreUpload';
import MusicBoxControls from './components/MusicBoxControls';
import MusicBoxPlayer from './components/MusicBoxPlayer';
import ExportPanel from './components/ExportPanel';
import AiAnalysisCard from './components/AiAnalysisCard';
import CopyrightNoticeModal from './components/CopyrightNoticeModal';

import { MusicNote, MusicBoxSettings, ScoreMeta } from './types';
import { SAMPLE_SONGS } from './data/sampleSongs';
import { MusicBoxAudioEngine } from './utils/audioEngine';
import { transformNotesForMusicBox } from './utils/musicParsers';

export default function App() {
  // Default Song: Canon in D
  const defaultSample = SAMPLE_SONGS[0];

  const [rawNotes, setRawNotes] = useState<MusicNote[]>(defaultSample.notes);
  const [meta, setMeta] = useState<ScoreMeta>({
    title: defaultSample.titleJa,
    composer: defaultSample.composer,
    timeSignature: defaultSample.timeSignature,
    originalBpm: defaultSample.bpm,
    keySignature: 'C Major',
    summary: defaultSample.description,
  });

  const [activeSongId, setActiveSongId] = useState<string | undefined>(defaultSample.id);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [isCopyrightModalOpen, setIsCopyrightModalOpen] = useState(false);
  const [aiCommentary, setAiCommentary] = useState<string | undefined>(undefined);

  // Music Box Settings
  const [settings, setSettings] = useState<MusicBoxSettings>({
    timbre: 'classic',
    tempoBpm: defaultSample.bpm,
    keyShift: 0,
    combCount: 18,
    removeChords: true,
    removeBass: true,
    simplifyTrills: true,
    reverbLevel: 0.45,
    mechanicalNoise: true,
    relaxationMode: false,
  });

  // Audio Engine Instance
  const [audioEngine, setAudioEngine] = useState<MusicBoxAudioEngine | null>(null);

  useEffect(() => {
    const engine = new MusicBoxAudioEngine(settings);
    setAudioEngine(engine);

    const unlockAudio = () => {
      engine.unlockAudio();
    };

    window.addEventListener('click', unlockAudio, { capture: true });
    window.addEventListener('pointerdown', unlockAudio, { capture: true });
    window.addEventListener('touchstart', unlockAudio, { capture: true });

    return () => {
      window.removeEventListener('click', unlockAudio, { capture: true });
      window.removeEventListener('pointerdown', unlockAudio, { capture: true });
      window.removeEventListener('touchstart', unlockAudio, { capture: true });
    };
  }, []);

  // Sync settings into audio engine when settings change
  useEffect(() => {
    if (audioEngine) {
      audioEngine.updateSettings(settings);
    }
  }, [settings, audioEngine]);

  // Compute transformed notes based on user toggles (remove bass, remove chords, simplify trills, comb range)
  const displayNotes = useMemo(() => {
    return transformNotesForMusicBox(rawNotes, {
      removeChords: settings.removeChords,
      removeBass: settings.removeBass,
      simplifyTrills: settings.simplifyTrills,
      combCount: settings.combCount,
      keyShift: settings.keyShift,
    });
  }, [rawNotes, settings]);

  // Handle Score Loading
  const handleScoreLoaded = (newMeta: ScoreMeta, newNotes: MusicNote[]) => {
    setRawNotes(newNotes);
    setMeta(newMeta);
    setActiveSongId(undefined); // user custom or new song
    setAiCommentary(undefined);
    if (newMeta.originalBpm) {
      setSettings((prev) => ({
        ...prev,
        tempoBpm: newMeta.originalBpm || 66,
      }));
    }
  };

  // Preview a single tine sound or test interval when clicking sound test/preset
  const handlePreviewTine = async (midi: number) => {
    if (audioEngine) {
      await audioEngine.ensureAudioRunning();
      audioEngine.playSingleNote(midi);
      setTimeout(() => {
        audioEngine.playSingleNote(midi + 7); // Perfect 5th interval (C5 -> G5)
      }, 160);
    }
  };

  // Call Express server-side Gemini API for AI auto-optimization
  const handleRunAiOptimization = async () => {
    if (displayNotes.length === 0) return;
    setIsAiOptimizing(true);

    try {
      const response = await fetch('/api/optimize-musicbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meta.title,
          notes: displayNotes,
          combCount: settings.combCount,
          settings,
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        const { optimizedNotes, arrangementCommentary } = resData.data;
        if (optimizedNotes && optimizedNotes.length > 0) {
          setRawNotes(optimizedNotes);
        }
        if (arrangementCommentary) {
          setAiCommentary(arrangementCommentary);
        }
      }
    } catch (err) {
      console.error('AI optimization failed:', err);
    } finally {
      setIsAiOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c0f0a] text-[#e5d3b3] font-sans selection:bg-[#3d251a] selection:text-[#e5d3b3] pb-16 antialiased">
      {/* Background Radial Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2d1b14] via-[#1c0f0a] to-[#120805] pointer-events-none -z-10" />

      {/* Application Header */}
      <Header
        onOpenCopyrightModal={() => setIsCopyrightModalOpen(true)}
        onTestSound={() => handlePreviewTine(72)}
      />

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* ① Sheet Music Upload & Sample Selector */}
        <ScoreUpload
          onScoreLoaded={handleScoreLoaded}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          activeSongId={activeSongId}
        />

        {/* Visualizer & Music Box Mechanical Player */}
        <MusicBoxPlayer
          notes={displayNotes}
          settings={settings}
          meta={meta}
          audioEngine={audioEngine}
          onPreviewNote={handlePreviewTine}
        />

        {/* ② Controls & Sound Presets */}
        <MusicBoxControls
          settings={settings}
          onUpdateSettings={setSettings}
          onPreviewTine={handlePreviewTine}
          onRunAiOptimization={handleRunAiOptimization}
          isAiOptimizing={isAiOptimizing}
          notesCount={displayNotes.length}
        />

        {/* ③ Export & Downloads */}
        <ExportPanel
          notes={displayNotes}
          settings={settings}
          meta={meta}
        />

        {/* ④ AI Analysis & Commentary Card */}
        <AiAnalysisCard
          meta={meta}
          commentary={aiCommentary}
        />
      </main>

      {/* Copyright Modal */}
      <CopyrightNoticeModal
        isOpen={isCopyrightModalOpen}
        onClose={() => setIsCopyrightModalOpen(false)}
      />
    </div>
  );
}
