import { MusicNote, ScoreMeta } from '../types';

// Convert pitch string e.g. "C4" or "F#5" to MIDI note number
export function pitchToMidi(pitch: string): number {
  const match = pitch.trim().match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)$/);
  if (!match) return 60; // default C4

  const [, letter, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  const baseMap: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
    c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
  };

  let noteVal = baseMap[letter] ?? 0;
  if (accidental === '#' || accidental === '♯') noteVal += 1;
  if (accidental === 'b' || accidental === '♭') noteVal -= 1;

  return (octave + 1) * 12 + noteVal;
}

// Convert MIDI note number to Pitch string
export function midiToPitch(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const name = names[(midi % 12 + 12) % 12];
  return `${name}${octave}`;
}

/**
 * Pure TypeScript MusicXML Parser
 */
export function parseMusicXML(xmlText: string): { meta: Partial<ScoreMeta>; notes: MusicNote[] } {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const titleEl = xmlDoc.querySelector('work-title') || xmlDoc.querySelector('movement-title');
  const title = titleEl?.textContent?.trim() || 'Imported Score';

  const composerEl = xmlDoc.querySelector('creator[type="composer"]');
  const composer = composerEl?.textContent?.trim() || 'Unknown Composer';

  const timeSig = xmlDoc.querySelector('time');
  const beats = timeSig?.querySelector('beats')?.textContent || '4';
  const beatType = timeSig?.querySelector('beat-type')?.textContent || '4';
  const timeSignature = `${beats}/${beatType}`;

  const tempoEl = xmlDoc.querySelector('per-minute');
  const bpm = tempoEl ? parseInt(tempoEl.textContent || '72', 10) : 72;

  const notes: MusicNote[] = [];
  const measures = xmlDoc.querySelectorAll('measure');

  let currentBeat = 0.0;
  let divisions = 1;

  measures.forEach((measure) => {
    const divEl = measure.querySelector('divisions');
    if (divEl) {
      divisions = parseInt(divEl.textContent || '1', 10);
    }

    let measureBeatOffset = 0.0;

    const noteEls = measure.querySelectorAll('note');
    noteEls.forEach((nEl, idx) => {
      const isRest = nEl.querySelector('rest') !== null;
      const durationEl = nEl.querySelector('duration');
      const durationDivs = durationEl ? parseInt(durationEl.textContent || '1', 10) : divisions;
      const durationBeats = durationDivs / divisions;

      const isChord = nEl.querySelector('chord') !== null;

      if (isRest) {
        if (!isChord) {
          measureBeatOffset += durationBeats;
        }
        return;
      }

      const pitchEl = nEl.querySelector('pitch');
      if (pitchEl) {
        const step = pitchEl.querySelector('step')?.textContent || 'C';
        const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0', 10);
        const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4', 10);

        let pitchStr = step;
        if (alter === 1) pitchStr += '#';
        if (alter === -1) pitchStr += 'b';
        pitchStr += octave;

        const midiNum = pitchToMidi(pitchStr);
        const noteStartBeat = isChord
          ? currentBeat + measureBeatOffset - durationBeats
          : currentBeat + measureBeatOffset;

        const isMelody = midiNum >= 60; // Top register

        notes.push({
          id: `xml-note-${idx}-${noteStartBeat}`,
          pitch: pitchStr,
          midiNumber: midiNum,
          startTime: Math.round(noteStartBeat * 100) / 100,
          duration: Math.max(0.25, Math.round(durationBeats * 100) / 100),
          velocity: 90,
          isMelody,
        });

        if (!isChord) {
          measureBeatOffset += durationBeats;
        }
      }
    });

    currentBeat += measureBeatOffset;
  });

  return {
    meta: {
      title,
      composer,
      timeSignature,
      originalBpm: bpm,
      notesCount: notes.length,
    },
    notes,
  };
}

/**
 * Pure TypeScript MIDI Binary Parser (.mid)
 */
export function parseMIDIBuffer(buffer: ArrayBuffer): { notes: MusicNote[]; bpm: number } {
  const data = new DataView(buffer);
  let pos = 0;

  // Header chunk 'MThd'
  const headerSig = String.fromCharCode(data.getUint8(0), data.getUint8(1), data.getUint8(2), data.getUint8(3));
  if (headerSig !== 'MThd') {
    throw new Error('Invalid MIDI header signature');
  }

  pos += 8; // skip signature and header length
  const format = data.getUint16(pos, false); pos += 2;
  const numTracks = data.getUint16(pos, false); pos += 2;
  const timeDivision = data.getUint16(pos, false); pos += 2;

  let bpm = 72;
  const notes: MusicNote[] = [];

  function readVarLength(): number {
    let result = 0;
    let byte = 0;
    do {
      byte = data.getUint8(pos++);
      result = (result << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return result;
  }

  for (let t = 0; t < numTracks; t++) {
    if (pos >= buffer.byteLength) break;

    const trackSig = String.fromCharCode(
      data.getUint8(pos), data.getUint8(pos + 1), data.getUint8(pos + 2), data.getUint8(pos + 3)
    );
    pos += 4;
    const trackLen = data.getUint32(pos, false); pos += 4;
    const trackEndPos = pos + trackLen;

    let currentTicks = 0;
    let runningStatus = 0;
    const activeNoteOnMap: Map<number, { startTicks: number; velocity: number }> = new Map();

    while (pos < trackEndPos && pos < buffer.byteLength) {
      const deltaTicks = readVarLength();
      currentTicks += deltaTicks;

      let status = data.getUint8(pos);
      if (status & 0x80) {
        pos++;
        runningStatus = status;
      } else {
        status = runningStatus;
      }

      const eventType = status & 0xf0;

      if (eventType === 0x90) { // Note On
        const noteNum = data.getUint8(pos++);
        const vel = data.getUint8(pos++);
        if (vel > 0) {
          activeNoteOnMap.set(noteNum, { startTicks: currentTicks, velocity: vel });
        } else {
          // vel = 0 is Note Off
          const startInfo = activeNoteOnMap.get(noteNum);
          if (startInfo) {
            const durationTicks = currentTicks - startInfo.startTicks;
            const startBeat = startInfo.startTicks / timeDivision;
            const durationBeats = durationTicks / timeDivision;
            notes.push({
              id: `midi-note-${t}-${noteNum}-${startBeat}`,
              pitch: midiToPitch(noteNum),
              midiNumber: noteNum,
              startTime: Math.round(startBeat * 100) / 100,
              duration: Math.max(0.25, Math.round(durationBeats * 100) / 100),
              velocity: startInfo.velocity,
              isMelody: noteNum >= 60,
            });
            activeNoteOnMap.delete(noteNum);
          }
        }
      } else if (eventType === 0x80) { // Note Off
        const noteNum = data.getUint8(pos++);
        pos++; // skip velocity
        const startInfo = activeNoteOnMap.get(noteNum);
        if (startInfo) {
          const durationTicks = currentTicks - startInfo.startTicks;
          const startBeat = startInfo.startTicks / timeDivision;
          const durationBeats = durationTicks / timeDivision;
          notes.push({
            id: `midi-note-${t}-${noteNum}-${startBeat}`,
            pitch: midiToPitch(noteNum),
            midiNumber: noteNum,
            startTime: Math.round(startBeat * 100) / 100,
            duration: Math.max(0.25, Math.round(durationBeats * 100) / 100),
            velocity: startInfo.velocity,
            isMelody: noteNum >= 60,
          });
          activeNoteOnMap.delete(noteNum);
        }
      } else if (status === 0xff) { // Meta Event
        const metaType = data.getUint8(pos++);
        const len = readVarLength();
        if (metaType === 0x51 && len === 3) { // Tempo Meta Event
          const microsecondsPerBeat = (data.getUint8(pos) << 16) | (data.getUint8(pos + 1) << 8) | data.getUint8(pos + 2);
          bpm = Math.round(60000000 / microsecondsPerBeat);
        }
        pos += len;
      } else if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0) {
        pos += 1;
      } else if (eventType >= 0xa0 && eventType <= 0xe0) {
        pos += 2;
      }
    }
  }

  // Sort notes chronologically
  notes.sort((a, b) => a.startTime - b.startTime);

  return { notes, bpm };
}

/**
 * Pure TypeScript MIDI Binary Generator (.mid)
 * Generates standard MIDI file Uint8Array
 */
export function generateMIDI(notes: MusicNote[], bpm = 72): Uint8Array {
  const ticksPerBeat = 480;
  const bytes: number[] = [];

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
  }

  function write32(val: number) {
    bytes.push((val >> 24) & 0xff);
    bytes.push((val >> 16) & 0xff);
    bytes.push((val >> 8) & 0xff);
    bytes.push(val & 0xff);
  }

  function write16(val: number) {
    bytes.push((val >> 8) & 0xff);
    bytes.push(val & 0xff);
  }

  function writeVarLen(val: number, arr: number[]) {
    let buffer = val & 0x7f;
    while ((val >>= 7)) {
      buffer <<= 8;
      buffer |= (val & 0x7f) | 0x80;
    }
    while (true) {
      arr.push(buffer & 0xff);
      if (buffer & 0x80) {
        buffer >>= 8;
      } else {
        break;
      }
    }
  }

  // Header 'MThd'
  writeString('MThd');
  write32(6); // header size
  write16(0); // single track format
  write16(1); // 1 track
  write16(ticksPerBeat);

  // Track data
  const trackEvents: { ticks: number; type: 'on' | 'off'; midi: number; vel: number }[] = [];

  notes.forEach((n) => {
    const startTicks = Math.round(n.startTime * ticksPerBeat);
    const endTicks = Math.round((n.startTime + n.duration) * ticksPerBeat);
    trackEvents.push({ ticks: startTicks, type: 'on', midi: n.midiNumber, vel: n.velocity || 90 });
    trackEvents.push({ ticks: endTicks, type: 'off', midi: n.midiNumber, vel: 0 });
  });

  trackEvents.sort((a, b) => a.ticks - b.ticks);

  const trackBytes: number[] = [];

  // Set Tempo Meta Event
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  trackBytes.push(0); // delta 0
  trackBytes.push(0xff, 0x51, 0x03);
  trackBytes.push((microsecondsPerBeat >> 16) & 0xff);
  trackBytes.push((microsecondsPerBeat >> 8) & 0xff);
  trackBytes.push(microsecondsPerBeat & 0xff);

  let lastTicks = 0;
  trackEvents.forEach((evt) => {
    const delta = evt.ticks - lastTicks;
    lastTicks = evt.ticks;
    writeVarLen(delta, trackBytes);

    if (evt.type === 'on') {
      trackBytes.push(0x90, evt.midi, evt.vel);
    } else {
      trackBytes.push(0x80, evt.midi, 0);
    }
  });

  // End of track meta event
  trackBytes.push(0, 0xff, 0x2f, 0x00);

  // Track Header 'MTrk'
  writeString('MTrk');
  write32(trackBytes.length);
  bytes.push(...trackBytes);

  return new Uint8Array(bytes);
}

/**
 * Perform Client-side Music Box Transformation / Filtering
 */
export function transformNotesForMusicBox(
  notes: MusicNote[],
  settings: {
    removeChords: boolean;
    removeBass: boolean;
    simplifyTrills: boolean;
    combCount: 18 | 30 | 50 | 72 | 100;
    keyShift: number;
  }
): MusicNote[] {
  let result = [...notes];

  // 0. Apply keyShift (if non-zero)
  if (settings.keyShift) {
    result = result.map((n) => {
      const shifted = n.midiNumber + settings.keyShift;
      return {
        ...n,
        midiNumber: shifted,
        pitch: midiToPitch(shifted),
      };
    });
  }

  // 1. Remove Low Bass (if checked)
  if (settings.removeBass) {
    result = result.filter((n) => n.midiNumber >= 55); // Keep middle C (C4 = 60) and above
  }

  // 2. Isolate Top Melody / Remove Chords (if checked)
  if (settings.removeChords) {
    // Group notes occurring at almost the same beat (< 0.05 beats apart)
    const timeGroups: Map<number, MusicNote[]> = new Map();
    result.forEach((note) => {
      const roundedTime = Math.round(note.startTime * 20) / 20;
      if (!timeGroups.has(roundedTime)) {
        timeGroups.set(roundedTime, []);
      }
      timeGroups.get(roundedTime)!.push(note);
    });

    const topNotesOnly: MusicNote[] = [];
    timeGroups.forEach((group) => {
      // Pick highest pitch note in chord
      const highestNote = group.reduce((prev, curr) => (curr.midiNumber > prev.midiNumber ? curr : prev));
      topNotesOnly.push(highestNote);
    });
    result = topNotesOnly;
  }

  // 3. Simplify Trills / Remove Fast Repeated Notes (< 0.12 beats apart on same tine)
  if (settings.simplifyTrills) {
    result.sort((a, b) => a.startTime - b.startTime);
    const filtered: MusicNote[] = [];
    result.forEach((note) => {
      const tooClose = filtered.find(
        (prev) => prev.midiNumber === note.midiNumber && Math.abs(note.startTime - prev.startTime) < 0.15
      );
      if (!tooClose) {
        filtered.push(note);
      }
    });
    result = filtered;
  }

  // 4. Adapt to Music Box Comb Count (18, 30, 50, 72, 100 tines)
  // If 100 (Unlimited/Full Orchestra), retain original pitch range without folding octaves
  if (settings.combCount < 100) {
    const minMidi =
      settings.combCount === 18 ? 60 : settings.combCount === 30 ? 55 : settings.combCount === 50 ? 48 : 36; // C4, G3, C3, C2
    const maxMidi =
      settings.combCount === 18 ? 84 : settings.combCount === 30 ? 96 : settings.combCount === 50 ? 97 : 108; // C6, C7, C7#, C8

    result = result.map((n) => {
      let shifted = n.midiNumber;
      while (shifted < minMidi) shifted += 12;
      while (shifted > maxMidi) shifted -= 12;
      return {
        ...n,
        midiNumber: shifted,
        pitch: midiToPitch(shifted),
      };
    });
  }

  return result;
}
