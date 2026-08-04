import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ScoreUpload from './components/ScoreUpload';
import MusicBoxControls from './components/MusicBoxControls';
import MusicBoxPlayer from './components/MusicBoxPlayer';
import PunchCardEditor from './components/PunchCardEditor';
import ExportPanel from './components/ExportPanel';
import AiAnalysisCard from './components/AiAnalysisCard';
import CopyrightNoticeModal from './components/CopyrightNoticeModal';
import TopWavPlayer from './components/TopWavPlayer';
import StaffNotationEditor from './components/StaffNotationEditor';
import { LibraryModal } from './components/LibraryModal';

import { MusicNote, MusicBoxSettings, ScoreMeta } from './types';
import { SAMPLE_SONGS } from './data/sampleSongs';
import { MusicBoxAudioEngine } from './utils/audioEngine';
import { transformNotesForMusicBox } from './utils/musicParsers';
import { checkCopyright, CopyrightCheckResult } from './lib/copyrightFilter';
import { saveSong } from './lib/localStorage';

export default function App() {
  const [rawNotes, setRawNotes] = useState<MusicNote[]>([]);

  const [meta, setMeta] = useState<ScoreMeta>({
    title: 'マイ楽譜（無題）',
    composer: 'オリジナル',
    timeSignature: '4/4',
    originalBpm: 80,
    keySignature: 'C Major',
    summary: '五線譜直接入力、画像/PDF/MIDIの読み込み、または鼻歌（Gemini AI）から作成できます。',
  });

  const [activeSongId, setActiveSongId] = useState<string | undefined>(undefined);
  const [currentSongId, setCurrentSongId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [isCopyrightModalOpen, setIsCopyrightModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [copyrightInfo, setCopyrightInfo] = useState<CopyrightCheckResult | null>(null);
  const [autoSavedToast, setAutoSavedToast] = useState(false);
  const [aiCommentary, setAiCommentary] = useState<string | undefined>(undefined);

  // Music Box Settings
  const [settings, setSettings] = useState<MusicBoxSettings>({
    timbre: 'wooden',
    tempoBpm: 80,
    keyShift: 0,
    combCount: 50,
    removeChords: false,
    removeBass: false,
    simplifyTrills: false,
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

  // Automatic Debounced Local Storage Auto-save
  useEffect(() => {
    if (!rawNotes || rawNotes.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const id = await saveSong({
          id: currentSongId,
          title: meta.title || '無題',
          composer: meta.composer || '',
          notes: rawNotes,
          settings,
          meta,
          copyrightStatus: copyrightInfo?.warningLevel,
        });
        if (!currentSongId) {
          setCurrentSongId(id);
        }
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [rawNotes, settings, meta, currentSongId, copyrightInfo]);

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
  const handleScoreLoaded = async (newMeta: ScoreMeta, newNotes: MusicNote[]) => {
    setRawNotes(newNotes);
    setMeta(newMeta);
    setActiveSongId(undefined); // user custom or new song
    setCurrentSongId(undefined);
    setAiCommentary(undefined);

    const cpCheck = checkCopyright(newMeta.title, newMeta.composer);
    setCopyrightInfo(cpCheck);

    if (newMeta.originalBpm) {
      setSettings((prev) => ({
        ...prev,
        tempoBpm: newMeta.originalBpm || 66,
      }));
    }

    // Save immediately to library
    try {
      const id = await saveSong({
        title: newMeta.title || '無題',
        composer: newMeta.composer || '',
        notes: newNotes,
        settings,
        meta: newMeta,
        copyrightStatus: cpCheck.warningLevel,
      });
      setCurrentSongId(id);
      setAutoSavedToast(true);
      setTimeout(() => setAutoSavedToast(false), 3000);
    } catch (err) {
      console.error('Save to library error:', err);
    }
  };

  // Handle loading from Library modal
  const handleLoadFromLibrary = (loadedNotes: MusicNote[], loadedMeta: ScoreMeta, loadedSettings?: MusicBoxSettings, songId?: string) => {
    setRawNotes(loadedNotes);
    setMeta(loadedMeta);
    if (loadedSettings) setSettings(loadedSettings);
    if (songId) setCurrentSongId(songId);

    const cpCheck = checkCopyright(loadedMeta.title, loadedMeta.composer);
    setCopyrightInfo(cpCheck);
  };

  // Handle direct punch card note editing
  const handleUpdateNotes = (updatedNotes: MusicNote[]) => {
    setRawNotes(updatedNotes);
    setMeta((prev) => ({
      ...prev,
      summary: `パンチカード編集（全 ${updatedNotes.length} 音）`,
    }));
  };

  // Preview a single tine sound or test interval when clicking sound test/preset
  const handlePreviewTine = (midi: number) => {
    let engine = audioEngine;
    if (!engine) {
      engine = new MusicBoxAudioEngine(settings);
      setAudioEngine(engine);
    }
    engine.unlockAudio();
    engine.playSingleNote(midi);
    setTimeout(() => {
      engine?.playSingleNote(midi + 7); // Perfect 5th interval (G5)
    }, 150);
    setTimeout(() => {
      engine?.playSingleNote(midi + 12); // Octave interval (C6)
    }, 300);
  };

  // Call Express server-side Gemini API for AI auto-optimization
  const handleRunAiOptimization = async () => {
    if (displayNotes.length === 0) return;
    setIsAiOptimizing(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const sessionToken = (window as any).__SESSION_TOKEN;
      if (sessionToken) {
        headers['x-session-token'] = sessionToken;
      }

      const response = await fetch('/api/optimize-musicbox', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: meta.title,
          notes: displayNotes,
          combCount: settings.combCount,
          settings,
        }),
      });

      const resText = await response.text();
      let resData: any = null;
      try {
        resData = JSON.parse(resText);
      } catch (jsonErr) {
        console.error('Non-JSON response from /api/optimize-musicbox:', resText);
        return;
      }

      if (resData && resData.success && resData.data) {
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
      <Header onOpenLibrary={() => setIsLibraryOpen(true)} />

      {/* Auto-saved Toast Notification */}
      {autoSavedToast && (
        <div className="fixed top-4 right-4 bg-[#c19a6b] text-[#1c0f0a] px-4 py-2 rounded-xl shadow-2xl text-xs font-bold z-50 animate-bounce">
          ✅ マイ書庫（ローカル）に保存しました
        </div>
      )}

      {/* Main Content Layout - Tablet & Desktop 2-Column Pillar Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Copyright Warning Banner if detected */}
        {copyrightInfo && copyrightInfo.warningLevel !== 'ok' && (
          <div className={`p-4 rounded-2xl text-xs border ${
            copyrightInfo.warningLevel === 'warning'
              ? 'bg-rose-950/80 text-rose-200 border-rose-800'
              : 'bg-amber-950/80 text-amber-200 border-amber-800'
          }`}>
            <p className="font-bold mb-0.5">著作権確認結果:</p>
            <p>{copyrightInfo.message}</p>
          </div>
        )}

        {/* Top Interactive Staff Score Notation Editor (五線譜🎼入力エディタ) */}
        <StaffNotationEditor
          notes={displayNotes}
          onChangeNotes={handleUpdateNotes}
          audioEngine={audioEngine}
          settings={settings}
          meta={meta}
        />

        {/* Top Priority WAV Audio Preview Player */}
        <TopWavPlayer
          notes={displayNotes}
          settings={settings}
          meta={meta}
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Pillar: Input, Export, & AI Commentary */}
          <div className="md:col-span-5 space-y-6">
            {/* Sheet Music Upload & Sample Selector */}
            <ScoreUpload
              onScoreLoaded={handleScoreLoaded}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              activeSongId={activeSongId}
            />

            {/* Export & Downloads (WAV Preview & Files) */}
            <ExportPanel
              notes={displayNotes}
              settings={settings}
              meta={meta}
              copyrightWarning={copyrightInfo?.warningLevel}
            />

            {/* AI Analysis & Commentary Card */}
            <AiAnalysisCard
              meta={meta}
              commentary={aiCommentary}
            />
          </div>

          {/* Right Pillar: Controls, Player Visualizer & Interactive Punch Card Editor */}
          <div className="md:col-span-7 space-y-6 md:sticky md:top-6">
            {/* Music Box Conversion & Timbre Adjustment Controls */}
            <MusicBoxControls
              settings={settings}
              onUpdateSettings={setSettings}
              onPreviewTine={handlePreviewTine}
              onRunAiOptimization={handleRunAiOptimization}
              isAiOptimizing={isAiOptimizing}
              notesCount={displayNotes.length}
            />

            {/* Visualizer & Music Box Mechanical Player */}
            <MusicBoxPlayer
              notes={displayNotes}
              settings={settings}
              meta={meta}
              audioEngine={audioEngine}
              onPreviewNote={handlePreviewTine}
            />

            {/* Interactive Punch Card Sheet Editor */}
            <PunchCardEditor
              notes={displayNotes}
              onChangeNotes={handleUpdateNotes}
              audioEngine={audioEngine}
              settings={settings}
            />
          </div>
        </div>
      </main>

      {/* Footer with Sound Test and Copyright Guidelines */}
      <Footer
        onOpenCopyrightModal={() => setIsCopyrightModalOpen(true)}
        onTestSound={() => handlePreviewTine(72)}
      />

      {/* Copyright Modal */}
      <CopyrightNoticeModal
        isOpen={isCopyrightModalOpen}
        onClose={() => setIsCopyrightModalOpen(false)}
      />

      {/* My Library Modal */}
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onLoadSong={handleLoadFromLibrary}
        audioEngine={audioEngine}
      />
    </div>
  );
}
