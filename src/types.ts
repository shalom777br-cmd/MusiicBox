/**
 * Music Box Generator Types
 */

export type TimbreType = 'classic' | 'antique' | 'glass' | 'crystal' | 'wooden';

export type CombType = 18 | 30 | 50;

export interface MusicNote {
  id: string;
  pitch: string;       // e.g. "C4", "F#5"
  midiNumber: number;  // e.g. 60 for C4
  startTime: number;   // in beats or seconds relative to tempo
  duration: number;    // in beats or seconds
  velocity?: number;   // 0-127
  isMelody?: boolean;
  isSimplified?: boolean;
  hand?: 'right' | 'left';
}

export interface MusicBoxSettings {
  timbre: TimbreType;
  tempoBpm: number;        // e.g. 60 BPM
  keyShift: number;        // -12 to +12 semitones
  combCount: CombType;     // 18, 30, or 50 tines
  removeChords: boolean;   // isolate top melody line
  removeBass: boolean;     // remove low accompaniment
  simplifyTrills: boolean; // remove fast repeated notes
  reverbLevel: number;     // 0.0 to 1.0
  mechanicalNoise: boolean;// subtle gear click/tick
  relaxationMode: boolean; // ultra slow relaxed tempo with extended decay
}

export interface ScoreMeta {
  title: string;
  composer: string;
  timeSignature: string;
  originalBpm: number;
  keySignature: string;
  summary?: string;
  commentary?: string;
  difficulty?: string;
  notesCount?: number;
}

export interface SamplePreset {
  id: string;
  title: string;
  titleJa: string;
  composer: string;
  timeSignature: string;
  bpm: number;
  description: string;
  iconName: string;
  notes: MusicNote[];
}
