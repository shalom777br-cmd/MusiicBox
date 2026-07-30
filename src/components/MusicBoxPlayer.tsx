import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  Sparkles,
  Clock,
  Music,
} from 'lucide-react';
import { MusicNote, MusicBoxSettings, ScoreMeta } from '../types';
import { MusicBoxAudioEngine, midiToPitchName } from '../utils/audioEngine';

interface MusicBoxPlayerProps {
  notes: MusicNote[];
  settings: MusicBoxSettings;
  meta: ScoreMeta;
  audioEngine: MusicBoxAudioEngine | null;
  onPreviewNote: (midi: number) => void;
}

export default function MusicBoxPlayer({
  notes,
  settings,
  meta,
  audioEngine,
  onPreviewNote,
}: MusicBoxPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(30);
  const [activeMidis, setActiveMidis] = useState<Set<number>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate notes timeline duration
  const maxBeat = notes.reduce((max, n) => Math.max(max, n.startTime + n.duration), 0);
  const totalBeats = Math.max(maxBeat + 2, 16);
  const secPerBeat = 60 / settings.tempoBpm;
  const computedTotalSec = totalBeats * secPerBeat;

  useEffect(() => {
    setTotalDurationSec(computedTotalSec);
  }, [notes, settings.tempoBpm, computedTotalSec]);

  const handleTestSound = () => {
    const testMidi = 72;
    setActiveMidis((prev) => {
      const next = new Set(prev);
      next.add(testMidi);
      return next;
    });
    onPreviewNote(testMidi);
    setTimeout(() => {
      setActiveMidis((prev) => {
        const next = new Set(prev);
        next.delete(testMidi);
        return next;
      });
    }, 450);
  };

  // Handle Play toggle
  const handleTogglePlay = async () => {
    if (!audioEngine) return;
    audioEngine.unlockAudio();

    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
      setActiveMidis(new Set());
    } else {
      setIsPlaying(true);
      await audioEngine.playSequence(
        notes,
        {
          onProgress: (beat, timeSec, durSec) => {
            setCurrentBeat(beat);
            setCurrentTimeSec(timeSec);
            setTotalDurationSec(durSec);
          },
          onNoteTrigger: (note) => {
            const midi = note.midiNumber + settings.keyShift;
            setActiveMidis((prev) => {
              const next = new Set(prev);
              next.add(midi);
              return next;
            });

            // Clear active hit animation after 180ms
            setTimeout(() => {
              setActiveMidis((prev) => {
                const next = new Set(prev);
                next.delete(midi);
                return next;
              });
            }, 180);
          },
          onEnded: () => {
            setIsPlaying(false);
            setCurrentBeat(0);
            setCurrentTimeSec(0);
            if (isLooping) {
              setTimeout(() => {
                handleTogglePlay();
              }, 300);
            }
          },
        },
        currentBeat
      );
    }
  };

  const handleStop = () => {
    if (audioEngine) {
      audioEngine.stop();
    }
    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentTimeSec(0);
    setActiveMidis(new Set());
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetBeat = parseFloat(e.target.value);
    setCurrentBeat(targetBeat);
    setCurrentTimeSec(targetBeat * secPerBeat);

    if (isPlaying && audioEngine) {
      audioEngine.playSequence(
        notes,
        {
          onProgress: (beat, timeSec, durSec) => {
            setCurrentBeat(beat);
            setCurrentTimeSec(timeSec);
            setTotalDurationSec(durSec);
          },
          onNoteTrigger: (note) => {
            const midi = note.midiNumber + settings.keyShift;
            setActiveMidis((prev) => new Set(prev).add(midi));
            setTimeout(() => {
              setActiveMidis((prev) => {
                const next = new Set(prev);
                next.delete(midi);
                return next;
              });
            }, 180);
          },
          onEnded: () => {
            setIsPlaying(false);
            setCurrentBeat(0);
            setCurrentTimeSec(0);
          },
        },
        targetBeat
      );
    }
  };

  // Canvas 2D Animated Mechanical Music Box Cylinder & Paper Roll Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Wood Cabinet Background
      ctx.fillStyle = '#1c0f0a';
      ctx.fillRect(0, 0, width, height);

      // Subtle wood grain gradient
      const woodGrad = ctx.createLinearGradient(0, 0, 0, height);
      woodGrad.addColorStop(0, '#2d1b14');
      woodGrad.addColorStop(0.5, '#1c0f0a');
      woodGrad.addColorStop(1, '#150a06');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(4, 4, width - 8, height - 8);

      // 2. Brass Frame & Roll Strip Box
      const marginX = 20;
      const rollY = 24;
      const rollHeight = height - 70;
      const rollWidth = width - marginX * 2;

      // Paper / Brass Roll Background
      const paperGrad = ctx.createLinearGradient(marginX, 0, marginX + rollWidth, 0);
      paperGrad.addColorStop(0, '#25150f');
      paperGrad.addColorStop(0.15, '#352017');
      paperGrad.addColorStop(0.5, '#452b1f');
      paperGrad.addColorStop(0.85, '#352017');
      paperGrad.addColorStop(1, '#25150f');
      ctx.fillStyle = paperGrad;
      ctx.fillRect(marginX, rollY, rollWidth, rollHeight);

      // Draw Grid / Bar lines
      ctx.strokeStyle = 'rgba(193, 154, 107, 0.15)';
      ctx.lineWidth = 1;
      const beatWidthPx = 40;
      const startX = marginX + rollWidth * 0.35; // Strike line offset at 35% width

      // Strike Line (The Music Box Comb Line)
      const strikeX = startX;

      // Draw Comb Tines line
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#c19a6b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(strikeX, rollY);
      ctx.lineTo(strikeX, rollY + rollHeight);
      ctx.stroke();

      // Pitch Mapping Y Coordinates (Lowest Pitch at Bottom, Highest Pitch at Top)
      const minPitch = 55; // G3
      const maxPitch = 90; // F#6
      const pitchRange = maxPitch - minPitch;

      const getNoteY = (midi: number) => {
        const norm = (midi - minPitch) / pitchRange;
        return rollY + rollHeight - 12 - norm * (rollHeight - 24);
      };

      // 3. Render Pins / Notes flowing on cylinder paper
      notes.forEach((note) => {
        const shiftedMidi = note.midiNumber + settings.keyShift;
        const noteX = strikeX + (note.startTime - currentBeat) * beatWidthPx;
        const noteY = getNoteY(shiftedMidi);

        // Only draw notes currently within canvas window
        if (noteX > marginX - 10 && noteX < marginX + rollWidth + 10) {
          const isHitting = Math.abs(noteX - strikeX) < 4;

          if (isHitting) {
            // Sparkle Hit Effect
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(noteX, noteY, 6, 0, Math.PI * 2);
            ctx.fill();

            // Vibrating tine pulse
            ctx.fillStyle = '#c19a6b';
            ctx.fillRect(strikeX - 2, noteY - 2, 12, 4);
          } else {
            // Standard Pin
            ctx.shadowColor = '#c19a6b';
            ctx.shadowBlur = note.isMelody ? 6 : 2;
            ctx.fillStyle = note.isMelody ? '#e5d3b3' : '#c19a6b';
            ctx.beginPath();
            ctx.arc(noteX, noteY, note.isMelody ? 3.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // 4. Render Metal Comb Tines on the Left
      ctx.shadowBlur = 0;
      const numTines = settings.combCount;
      for (let i = 0; i < numTines; i++) {
        const tineMidi = Math.round(minPitch + (i / (numTines - 1)) * pitchRange);
        const tineY = getNoteY(tineMidi);
        const isActive = activeMidis.has(tineMidi);

        ctx.strokeStyle = isActive ? '#fef08a' : '#3d251a';
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(strikeX, tineY);
        ctx.lineTo(strikeX - 25, tineY);
        ctx.stroke();

        // Tine Tip
        ctx.fillStyle = isActive ? '#ffffff' : '#c19a6b';
        ctx.beginPath();
        ctx.arc(strikeX - 25, tineY, isActive ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer Brass Bezel Frame
      ctx.strokeStyle = '#3d251a';
      ctx.lineWidth = 2;
      ctx.strokeRect(marginX, rollY, rollWidth, rollHeight);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [notes, currentBeat, settings, activeMidis]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#2d1b14] border border-[#3d251a] rounded-[32px] p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
      {/* Top Controls & Status Indicators */}
      <div className="flex flex-row items-center justify-end gap-4 border-b border-[#3d251a] pb-4">
        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Visual Active Sound Signal Indicator */}
          <div
            className={`flex items-center space-x-2 text-xs font-mono px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
              isPlaying || activeMidis.size > 0
                ? 'bg-[#4ade80]/15 border-[#4ade80]/60 text-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.25)]'
                : 'bg-[#1c0f0a] border-[#3d251a] text-[#e5d3b3]/40'
            }`}
            title="オーディオ発音トリガー状態"
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {(isPlaying || activeMidis.size > 0) && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-200 ${
                  isPlaying || activeMidis.size > 0 ? 'bg-[#4ade80]' : 'bg-[#3d251a]'
                }`}
              />
            </span>
            <span className="font-semibold tracking-wider">
              {isPlaying || activeMidis.size > 0
                ? activeMidis.size > 0
                  ? `ACTIVE (${Array.from(activeMidis).map(midiToPitchName).join(', ')})`
                  : 'ACTIVE (再生中)'
                : 'STANDBY'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-[#1c0f0a] px-3.5 py-1.5 rounded-full border border-[#3d251a] text-[#c19a6b]">
            <Clock className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span>
              {formatTime(currentTimeSec)} / {formatTime(totalDurationSec)}
            </span>
          </div>
        </div>
      </div>

      {/* 2D Music Box Mechanical Cylinder Canvas Visualizer */}
      <div className="relative rounded-[24px] overflow-hidden border border-[#3d251a] shadow-inner bg-[#1c0f0a]">
        <canvas
          ref={canvasRef}
          width={700}
          height={220}
          className="w-full h-[200px] sm:h-[220px] object-cover block"
        />

        {/* Active Audio Trigger Indicator Overlay */}
        <div className="absolute top-3 left-3 flex items-center space-x-2">
          <div
            className={`px-3 py-1 rounded-full border text-[10px] font-mono tracking-wider transition-all duration-150 flex items-center space-x-1.5 backdrop-blur-md ${
              isPlaying || activeMidis.size > 0
                ? 'bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.3)]'
                : 'bg-[#1c0f0a]/80 border-[#3d251a] text-[#e5d3b3]/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying || activeMidis.size > 0 ? 'bg-[#4ade80] animate-pulse' : 'bg-[#3d251a]'
              }`}
            />
            <span>{isPlaying || activeMidis.size > 0 ? 'AUDIO SIGNAL: ON' : 'AUDIO SIGNAL: IDLE'}</span>
          </div>
        </div>

        {/* Visualizer Overlay Badge */}
        <div className="absolute top-3 right-3 text-[10px] bg-[#1c0f0a]/80 text-[#c19a6b] px-3 py-1 rounded-full border border-[#3d251a] backdrop-blur-xs flex items-center space-x-1.5 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-[#c19a6b]" />
          <span>ピン＆シリンダー機構リアルタイムアニメーション</span>
        </div>
      </div>

      {/* Timeline Seekbar */}
      <div className="space-y-1.5">
        <input
          type="range"
          min="0"
          max={totalBeats}
          step="0.1"
          value={currentBeat}
          onChange={handleSeek}
          className="w-full accent-[#c19a6b] cursor-pointer h-2 bg-[#1c0f0a] rounded-full border border-[#3d251a]"
        />
        <div className="flex justify-between text-[10px] text-[#e5d3b3]/50 font-mono px-1">
          <span>00:00 (小節 1)</span>
          <span>{formatTime(totalDurationSec)}</span>
        </div>
      </div>

      {/* Control Buttons (Play, Pause, Stop, Loop) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center space-x-3">
          {/* Main Play/Pause Button */}
          <button
            onClick={handleTogglePlay}
            disabled={notes.length === 0}
            className="flex items-center space-x-2 px-7 py-3 rounded-full bg-[#c19a6b] hover:bg-[#d4ac7d] text-[#1c0f0a] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#c19a6b]/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-[#1c0f0a]" />
                <span>一時停止</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-[#1c0f0a]" />
                <span>オルゴール再生</span>
              </>
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStop}
            className="p-3 rounded-full bg-[#1c0f0a] hover:bg-[#3d251a] border border-[#3d251a] text-[#c19a6b] transition-colors cursor-pointer"
            title="停止"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Loop Toggle Button */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-3 rounded-full border transition-all cursor-pointer ${
              isLooping
                ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] shadow-sm'
                : 'bg-[#1c0f0a] border-[#3d251a] text-[#e5d3b3]/50 hover:text-[#c19a6b]'
            }`}
            title="リピート再生"
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Test Sound Button */}
          <button
            onClick={handleTestSound}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-full bg-[#1c0f0a] hover:bg-[#3d251a] border border-[#3d251a] text-[#c19a6b] text-xs font-medium transition-all cursor-pointer"
            title="試聴音鳴らし"
          >
            <Volume2 className="w-4 h-4 text-[#c19a6b]" />
            <span>試聴テスト</span>
          </button>
        </div>

        {/* Mechanical Crank Info */}
        <div className="text-xs text-[#e5d3b3]/70 flex items-center space-x-2 bg-[#1c0f0a] px-4 py-2 rounded-full border border-[#3d251a]">
          <Music className="w-4 h-4 text-[#c19a6b] shrink-0" />
          <span>{settings.mechanicalNoise ? 'ゼンマイ効果音 ON' : 'クリア音色'}</span>
        </div>
      </div>
    </div>
  );
}
