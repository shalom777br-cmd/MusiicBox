import { TimbreType, MusicNote, MusicBoxSettings } from '../types';

// Convert MIDI note number to frequency (Hz)
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert frequency to pitch string e.g. 60 -> C4
export function midiToPitchName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

export class MusicBoxAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  private isPlaying = false;
  private currentBeat = 0;
  private timerId: number | null = null;
  private activeNotes: MusicNote[] = [];
  private settings: MusicBoxSettings;

  private onProgressCallback?: (beat: number, currentTimeSec: number, totalDurationSec: number) => void;
  private onNoteTriggerCallback?: (note: MusicNote) => void;
  private onEndedCallback?: () => void;

  private startTimeReal = 0;
  private totalBeats = 16;

  private scheduledNodes: { osc: OscillatorNode | AudioBufferSourceNode; gain: GainNode; stopTime: number }[] = [];

  constructor(settings: MusicBoxSettings) {
    this.settings = settings;
  }

  public updateSettings(newSettings: MusicBoxSettings) {
    this.settings = newSettings;
  }

  public initAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Safari state listener: auto-resume if state changes away from running
      this.ctx.addEventListener('statechange', () => {
        if (this.ctx && (this.ctx.state as string) !== 'running' && this.isPlaying) {
          this.ctx.resume().catch(() => {});
        }
      });
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 1.0;

      // Reverb path
      this.reverbGain = this.ctx.createGain();
      const revVol = Math.max(0.0, Math.min(0.8, (this.settings?.reverbLevel ?? 0.3) * 0.4));
      this.reverbGain.gain.value = revVol;

      try {
        const delayL = this.ctx.createDelay();
        delayL.delayTime.value = 0.045;
        const delayR = this.ctx.createDelay();
        delayR.delayTime.value = 0.068;

        this.dryGain.connect(delayL);
        this.dryGain.connect(delayR);

        delayL.connect(this.reverbGain);
        delayR.connect(this.reverbGain);

        this.reverbGain.connect(this.masterGain);
      } catch (e) {
        // Fallback simple reverb connection
        this.dryGain.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
      }

      this.dryGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } else if (this.reverbGain) {
      const revVol = Math.max(0.0, Math.min(0.8, (this.settings?.reverbLevel ?? 0.3) * 0.4));
      this.reverbGain.gain.value = revVol;
    }

    return this.ctx;
  }

  // Synchronously unlock and resume AudioContext during user gesture (Critical for iOS Safari)
  public unlockAudio(): AudioContext {
    const ctx = this.initAudioContext();
    if (ctx) {
      if ((ctx.state as string) !== 'running') {
        ctx.resume().catch((e) => console.warn('Unlock resume catch:', e));
      }

      // iOS Safari Web Audio unlock: play a silent 1-sample buffer synchronously
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (e) {
        // ignore
      }

      // Wake up physical audio hardware with a 2ms soft sine chime
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.005);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.006);
      } catch (e) {
        // ignore
      }
    }
    return ctx;
  }

  // Check if AudioContext is currently active
  public isAudioRunning(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  public getAudioState(): string {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  // Ensure AudioContext is instantiated and running
  public async ensureAudioRunning(): Promise<AudioContext | null> {
    const ctx = this.unlockAudio();
    if (!ctx) return null;

    if ((ctx.state as string) !== 'running') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    // Ensure master and dry gains are fully open
    if (this.dryGain) {
      this.dryGain.gain.value = 1.0;
    }
    if (this.masterGain) {
      this.masterGain.gain.value = 0.9;
    }

    return ctx;
  }

  // Play a single note immediately (for live preview when clicking controls / keys)
  public async playSingleNote(midiNumber: number, duration: number = 1.0) {
    const ctx = this.unlockAudio();
    if ((ctx.state as string) !== 'running') {
      try {
        await ctx.resume();
      } catch (e) {
        // ignore
      }
    }

    const now = ctx.currentTime + 0.02;
    const shiftedMidi = midiNumber + (this.settings?.keyShift || 0);
    this.synthesizeTine(shiftedMidi, now, duration, 100, this.settings?.timbre || 'classic');
    if (this.settings?.mechanicalNoise) {
      this.playMechanicalTick(now);
    }
  }

  // Synthesize realistic music box tine pluck sound
  private synthesizeTine(
    midi: number,
    startTime: number,
    durationBeat: number,
    velocity = 90,
    timbre: TimbreType
  ) {
    const ctx = this.initAudioContext();
    if (!ctx || !this.dryGain) return;

    // Safeguard startTime against times strictly in the past
    const safeStartTime = Math.max(startTime, ctx.currentTime + 0.02);
    const freq = midiToFreq(midi);
    const velRatio = Math.max(0.2, velocity / 127);

    // Fundamental decay time according to pitch (higher notes decay faster)
    let decaySec = Math.max(1.2, 3.8 - (midi - 55) * 0.04);
    if (this.settings?.relaxationMode) {
      decaySec *= 1.5;
    }

    const outputTarget = this.dryGain;

    // 1. Physical Pin Pluck Transient (Tiny high-frequency metallic "ting")
    try {
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(Math.min(11000, Math.max(2800, freq * 3.5)), safeStartTime);

      clickGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      clickGain.gain.setValueAtTime(0.25 * velRatio, safeStartTime);
      clickGain.gain.linearRampToValueAtTime(0.0001, safeStartTime + 0.012);

      clickOsc.connect(clickGain);
      clickGain.connect(outputTarget);

      clickOsc.start(safeStartTime);
      clickOsc.stop(safeStartTime + 0.015);

      this.scheduledNodes.push({ osc: clickOsc, gain: clickGain, stopTime: safeStartTime + 0.015 });
    } catch (e) {
      // Ignore transient errors
    }

    // 2. Timbre Harmonics & Decay Setup
    let harmonicFactors = [1.0, 2.756, 5.404];
    let harmonicGains = [1.0, 0.25, 0.08];
    let filterCutoff = 10000;

    switch (timbre) {
      case 'classic': // Classic Steel Comb
        harmonicFactors = [1.0, 2.756, 5.404];
        harmonicGains = [1.0, 0.22, 0.06];
        filterCutoff = 10000;
        break;
      case 'wooden': // Wooden Kalimba / Marimba Box
        harmonicFactors = [1.0, 1.5, 2.5];
        harmonicGains = [1.0, 0.18, 0.03];
        filterCutoff = 5000;
        break;
      default:
        harmonicFactors = [1.0, 1.5, 2.5];
        harmonicGains = [1.0, 0.18, 0.03];
        filterCutoff = 5000;
        break;
    }

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(filterCutoff, safeStartTime);
    bodyFilter.connect(outputTarget);

    // Synthesize partials
    harmonicFactors.forEach((factor, idx) => {
      const partialFreq = freq * factor;
      if (partialFreq > 16000) return; // avoid aliasing

      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(partialFreq, safeStartTime);

        const partialVol = harmonicGains[idx] * velRatio * 0.65;
        const partialDecay = idx === 0 ? decaySec : Math.min(0.25, decaySec * 0.08);

        // Immediate pluck amplitude with smooth 3-stage envelope
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, safeStartTime);
        gain.gain.linearRampToValueAtTime(partialVol, safeStartTime + 0.003);
        try {
          gain.gain.exponentialRampToValueAtTime(0.0001, safeStartTime + partialDecay);
        } catch (e) {
          gain.gain.linearRampToValueAtTime(0.0001, safeStartTime + partialDecay);
        }

        osc.connect(gain);
        gain.connect(bodyFilter);
        if (idx === 0) {
          // Direct fail-safe connection for fundamental note
          gain.connect(outputTarget);
        }

        osc.start(safeStartTime);
        osc.stop(safeStartTime + partialDecay + 0.05);

        this.scheduledNodes.push({ osc, gain, stopTime: safeStartTime + partialDecay + 0.05 });
      } catch (e) {
        console.warn('Partial synthesis error:', e);
      }
    });
  }

  // Play subtle mechanical gear click
  private playMechanicalTick(startTime: number) {
    const ctx = this.initAudioContext();
    if (!ctx || !this.dryGain) return;
    const safeStartTime = Math.max(startTime, ctx.currentTime + 0.003);

    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.012);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, safeStartTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.dryGain);

      noise.start(safeStartTime);

      this.scheduledNodes.push({ osc: noise, gain, stopTime: safeStartTime + 0.05 });
    } catch (e) {
      // Ignore
    }
  }

  // Start sequence playback
  public async playSequence(
    notes: MusicNote[],
    callbacks: {
      onProgress?: (beat: number, currentTimeSec: number, totalDurationSec: number) => void;
      onNoteTrigger?: (note: MusicNote) => void;
      onEnded?: () => void;
    },
    startFromBeat = 0
  ) {
    // 1. Synchronously unlock context inside user gesture stack (CRITICAL for Safari)
    const ctx = this.unlockAudio();
    if ((ctx.state as string) !== 'running') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume error in playSequence:', e);
      }
    }

    this.stop();
    this.isPlaying = true;
    this.activeNotes = notes;

    this.onProgressCallback = callbacks.onProgress;
    this.onNoteTriggerCallback = callbacks.onNoteTrigger;
    this.onEndedCallback = callbacks.onEnded;

    // Calculate total duration in beats
    const maxEndBeat = notes.reduce((max, n) => Math.max(max, n.startTime + n.duration), 0);
    this.totalBeats = Math.max(maxEndBeat + 2, 16);

    let startBeat = startFromBeat;
    if (startBeat >= this.totalBeats - 0.1) {
      startBeat = 0;
    }
    this.currentBeat = startBeat;

    const bpm = this.settings.tempoBpm;
    const secPerBeat = 60 / bpm;
    const totalDurationSec = this.totalBeats * secPerBeat;

    const scheduleOffsetSec = 0.08; // 80ms buffer to ensure nodes start in the future
    this.startTimeReal = ctx.currentTime + scheduleOffsetSec - startBeat * secPerBeat;

    // Schedule all notes from startBeat onwards
    notes.forEach((note) => {
      if (!note.isRest && note.startTime >= startBeat - 0.01) {
        const noteTimeReal = this.startTimeReal + note.startTime * secPerBeat;
        const shiftedMidi = note.midiNumber + this.settings.keyShift;

        this.synthesizeTine(
          shiftedMidi,
          noteTimeReal,
          note.duration,
          note.velocity || 90,
          this.settings.timbre
        );

        if (this.settings.mechanicalNoise) {
          this.playMechanicalTick(noteTimeReal);
        }
      }
    });

    const updateLoop = () => {
      if (!this.isPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const elapsedSec = now - this.startTimeReal;
      const currentBeat = elapsedSec / secPerBeat;

      if (currentBeat >= this.totalBeats) {
        this.stop();
        if (this.onProgressCallback) {
          this.onProgressCallback(0, 0, totalDurationSec);
        }
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
        return;
      }

      this.currentBeat = Math.max(0, currentBeat);

      // Trigger visualizer events
      if (this.onNoteTriggerCallback) {
        const windowBeat = 0.12;
        notes.forEach((n) => {
          if (Math.abs(n.startTime - currentBeat) < windowBeat) {
            this.onNoteTriggerCallback!(n);
          }
        });
      }

      if (this.onProgressCallback) {
        this.onProgressCallback(this.currentBeat, Math.max(0, elapsedSec), totalDurationSec);
      }

      this.timerId = requestAnimationFrame(updateLoop);
    };

    this.timerId = requestAnimationFrame(updateLoop);
  }

  public pause() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;

      // Cleanly stop and disconnect all scheduled audio nodes
      for (const item of this.scheduledNodes) {
        try {
          item.gain.gain.cancelScheduledValues(now);
          item.gain.gain.setValueAtTime(0, now);
          item.gain.disconnect();
          item.osc.stop(now);
          item.osc.disconnect();
        } catch (e) {
          // ignore
        }
      }
    }

    this.scheduledNodes = [];
  }

  public stop() {
    this.pause();
    this.currentBeat = 0;
  }

  public getCurrentBeat(): number {
    return this.currentBeat;
  }

  public getTotalBeats(): number {
    return this.totalBeats;
  }

  // Render notes offline directly to WAV File Blob
  public static async renderToWavBlob(
    notes: MusicNote[],
    settings: MusicBoxSettings
  ): Promise<Blob> {
    const bpm = settings.tempoBpm;
    const secPerBeat = 60 / bpm;
    const maxBeat = notes.reduce((max, n) => Math.max(max, n.startTime + n.duration), 0);
    const totalDurationSec = Math.max((maxBeat + 2) * secPerBeat, 4.0);

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDurationSec * sampleRate), sampleRate);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.85;

    // Simple delay reverb for offline render
    const delay = offlineCtx.createDelay();
    delay.delayTime.value = 0.05;
    const revGain = offlineCtx.createGain();
    revGain.gain.value = settings.reverbLevel * 0.4;

    masterGain.connect(offlineCtx.destination);
    masterGain.connect(delay);
    delay.connect(revGain);
    revGain.connect(offlineCtx.destination);

    notes.forEach((note) => {
      if (note.isRest) return;
      const startTime = note.startTime * secPerBeat;
      const shiftedMidi = note.midiNumber + settings.keyShift;
      const freq = midiToFreq(shiftedMidi);
      const velRatio = Math.max(0.1, (note.velocity || 90) / 127);
      let decaySec = Math.max(0.9, 3.2 - (shiftedMidi - 55) * 0.04);
      if (settings.relaxationMode) decaySec *= 1.4;

      // Pin tap
      const click = offlineCtx.createOscillator();
      const clickG = offlineCtx.createGain();
      click.frequency.setValueAtTime(Math.min(12000, Math.max(3000, freq * 3.8)), startTime);
      clickG.gain.setValueAtTime(0.12 * velRatio, startTime);
      clickG.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.008);
      click.connect(clickG);
      clickG.connect(masterGain);
      click.start(startTime);
      click.stop(startTime + 0.012);

      // Partials
      const factors = [1.0, 2.756, 5.404];
      const gains = [1.0, 0.22, 0.06];

      factors.forEach((factor, idx) => {
        const pFreq = freq * factor;
        if (pFreq > 17000) return;

        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pFreq, startTime);

        const pVol = gains[idx] * velRatio * 0.38;
        const pDecay = idx === 0 ? decaySec : Math.min(0.18, decaySec * 0.05);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(pVol, startTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + pDecay);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + pDecay + 0.05);
      });
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return MusicBoxAudioEngine.audioBufferToWavBlob(renderedBuffer);
  }

  // Convert AudioBuffer to standard 16-bit PCM WAV Blob
  private static audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let channels: Float32Array[] = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;

    function writeString(str: string) {
      for (let i = 0; i < str.length; i++) {
        out.setUint8(offset++, str.charCodeAt(i));
      }
    }

    /* RIFF identifier */
    writeString('RIFF');
    /* RIFF chunk length */
    out.setUint32(offset, length - 8, true);
    offset += 4;
    /* RIFF type */
    writeString('WAVE');
    /* format chunk identifier */
    writeString('fmt ');
    /* format chunk length */
    out.setUint32(offset, 16, true);
    offset += 4;
    /* sample format (raw PCM) */
    out.setUint16(offset, 1, true);
    offset += 2;
    /* channel count */
    out.setUint16(offset, numOfChan, true);
    offset += 2;
    /* sample rate */
    out.setUint32(offset, sampleRate, true);
    offset += 4;
    /* byte rate (sample rate * block align) */
    out.setUint32(offset, sampleRate * 2 * numOfChan, true);
    offset += 4;
    /* block align (channel count * bytes per sample) */
    out.setUint16(offset, numOfChan * 2, true);
    offset += 2;
    /* bits per sample */
    out.setUint16(offset, 16, true);
    offset += 2;
    /* data chunk identifier */
    writeString('data');
    /* data chunk length */
    out.setUint32(offset, length - offset - 4, true);
    offset += 4;

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let pos = 0;
    while (pos < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][pos]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        out.setInt16(offset, sample, true);
        offset += 2;
      }
      pos++;
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  }
}
