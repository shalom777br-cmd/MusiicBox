import { SamplePreset, MusicNote } from '../types';

function createNote(pitch: string, midi: number, start: number, duration: number, isMelody = true): MusicNote {
  return {
    id: `note-${start}-${midi}`,
    pitch,
    midiNumber: midi,
    startTime: start,
    duration,
    velocity: 90,
    isMelody,
  };
}

export const SAMPLE_SONGS: SamplePreset[] = [
  {
    id: 'canon-in-d',
    title: 'Canon in D',
    titleJa: 'パッヘルベルのカノン',
    composer: 'Johann Pachelbel',
    timeSignature: '4/4',
    bpm: 66,
    description: '澄んだメロディと美しいハーモニーが響く、オルゴール定番の癒やしの名曲。',
    iconName: 'Sparkles',
    notes: [
      // Melody (Right Hand)
      createNote('F#5', 78, 0.0, 1.0),
      createNote('E5', 76, 1.0, 1.0),
      createNote('D5', 74, 2.0, 1.0),
      createNote('C#5', 73, 3.0, 1.0),
      createNote('B4', 71, 4.0, 1.0),
      createNote('A4', 69, 5.0, 1.0),
      createNote('B4', 71, 6.0, 1.0),
      createNote('C#5', 73, 7.0, 1.0),

      // Variations / Second phrase
      createNote('D5', 74, 8.0, 0.5),
      createNote('F#5', 78, 8.5, 0.5),
      createNote('E5', 76, 9.0, 0.5),
      createNote('G5', 79, 9.5, 0.5),
      createNote('F#5', 78, 10.0, 0.5),
      createNote('D5', 74, 10.5, 0.5),
      createNote('E5', 76, 11.0, 0.5),
      createNote('A4', 69, 11.5, 0.5),

      createNote('D5', 74, 12.0, 0.5),
      createNote('B4', 71, 12.5, 0.5),
      createNote('C#5', 73, 13.0, 0.5),
      createNote('D5', 74, 13.5, 0.5),
      createNote('B4', 71, 14.0, 0.5),
      createNote('D5', 74, 14.5, 0.5),
      createNote('C#5', 73, 15.0, 1.0),

      // Accompaniment Bass / Inner voice
      createNote('D4', 62, 0.0, 2.0, false),
      createNote('A3', 57, 2.0, 2.0, false),
      createNote('B3', 59, 4.0, 2.0, false),
      createNote('F#3', 54, 6.0, 2.0, false),
      createNote('G3', 55, 8.0, 2.0, false),
      createNote('D3', 50, 10.0, 2.0, false),
      createNote('G3', 55, 12.0, 2.0, false),
      createNote('A3', 57, 14.0, 2.0, false),
    ],
  },
  {
    id: 'fur-elise',
    title: 'Für Elise',
    titleJa: 'エリゼのために',
    composer: 'Ludwig van Beethoven',
    timeSignature: '3/8',
    bpm: 72,
    description: '繊細でロマンチックなオルゴールの響きに最適なベートーヴェンの傑作。',
    iconName: 'Music',
    notes: [
      createNote('E5', 76, 0.0, 0.5),
      createNote('D#5', 75, 0.5, 0.5),
      createNote('E5', 76, 1.0, 0.5),
      createNote('D#5', 75, 1.5, 0.5),
      createNote('E5', 76, 2.0, 0.5),
      createNote('B4', 71, 2.5, 0.5),
      createNote('D5', 74, 3.0, 0.5),
      createNote('C5', 72, 3.5, 0.5),
      createNote('A4', 69, 4.0, 1.0),

      createNote('C4', 60, 5.0, 0.5, false),
      createNote('E4', 64, 5.5, 0.5, false),
      createNote('A4', 69, 6.0, 0.5),
      createNote('B4', 71, 6.5, 1.0),

      createNote('E4', 64, 7.5, 0.5, false),
      createNote('G#4', 68, 8.0, 0.5, false),
      createNote('B4', 71, 8.5, 0.5),
      createNote('C5', 72, 9.0, 1.0),

      createNote('E5', 76, 10.5, 0.5),
      createNote('D#5', 75, 11.0, 0.5),
      createNote('E5', 76, 11.5, 0.5),
      createNote('D#5', 75, 12.0, 0.5),
      createNote('E5', 76, 12.5, 0.5),
      createNote('B4', 71, 13.0, 0.5),
      createNote('D5', 74, 13.5, 0.5),
      createNote('C5', 72, 14.0, 0.5),
      createNote('A4', 69, 14.5, 1.5),
    ],
  },
  {
    id: 'gymnopedie-1',
    title: 'Gymnopédie No. 1',
    titleJa: 'ジムノペディ 第1番',
    composer: 'Erik Satie',
    timeSignature: '3/4',
    bpm: 54,
    description: '浮遊感あふれる美しい和音とアンティークな雰囲気に包まれる癒やしのテーマ。',
    iconName: 'Moon',
    notes: [
      createNote('F#5', 78, 2.0, 2.0),
      createNote('E5', 76, 4.0, 1.0),
      createNote('D5', 74, 5.0, 1.0),
      createNote('C#5', 73, 6.0, 1.0),
      createNote('B4', 71, 7.0, 1.0),
      createNote('C#5', 73, 8.0, 1.0),
      createNote('D5', 74, 9.0, 2.0),
      createNote('A4', 69, 11.0, 1.0),

      // Accompaniment arpeggio
      createNote('G3', 55, 0.0, 1.0, false),
      createNote('B4', 71, 1.0, 1.0, false),
      createNote('D4', 62, 3.0, 1.0, false),
      createNote('F#4', 66, 4.0, 1.0, false),
      createNote('G3', 55, 6.0, 1.0, false),
      createNote('B4', 71, 7.0, 1.0, false),
      createNote('D4', 62, 9.0, 1.0, false),
      createNote('F#4', 66, 10.0, 1.0, false),
    ],
  },
  {
    id: 'twinkle-star',
    title: 'Twinkle, Twinkle, Little Star',
    titleJa: 'きらきら星',
    composer: 'Traditional / W.A. Mozart',
    timeSignature: '4/4',
    bpm: 76,
    description: '誰にでも親しまれる素朴でかわいらしいクリスタルオルゴール旋律。',
    iconName: 'Star',
    notes: [
      createNote('C5', 72, 0.0, 1.0),
      createNote('C5', 72, 1.0, 1.0),
      createNote('G5', 79, 2.0, 1.0),
      createNote('G5', 79, 3.0, 1.0),
      createNote('A5', 81, 4.0, 1.0),
      createNote('A5', 81, 5.0, 1.0),
      createNote('G5', 79, 6.0, 2.0),

      createNote('F5', 77, 8.0, 1.0),
      createNote('F5', 77, 9.0, 1.0),
      createNote('E5', 76, 10.0, 1.0),
      createNote('E5', 76, 11.0, 1.0),
      createNote('D5', 74, 12.0, 1.0),
      createNote('D5', 74, 13.0, 1.0),
      createNote('C5', 72, 14.0, 2.0),
    ],
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    titleJa: 'アメイジング・グレイス',
    composer: 'Traditional Hymn',
    timeSignature: '3/4',
    bpm: 58,
    description: '最初から最後まで静けさと温もりにあふれた讃美歌の全曲オルゴール旋律。',
    iconName: 'Heart',
    notes: [
      // Pickup
      createNote('D4', 62, 2.0, 1.0),

      // Measure 1
      createNote('G4', 67, 3.0, 2.0),
      createNote('B4', 71, 5.0, 0.5),
      createNote('G4', 67, 5.5, 0.5),
      createNote('G3', 55, 3.0, 3.0, false),
      createNote('D4', 62, 4.0, 2.0, false),

      // Measure 2
      createNote('B4', 71, 6.0, 2.0),
      createNote('A4', 69, 8.0, 1.0),
      createNote('G3', 55, 6.0, 3.0, false),
      createNote('D4', 62, 7.0, 2.0, false),

      // Measure 3
      createNote('G4', 67, 9.0, 2.0),
      createNote('E4', 64, 11.0, 1.0),
      createNote('C3', 48, 9.0, 3.0, false),
      createNote('E4', 64, 10.0, 2.0, false),

      // Measure 4
      createNote('D4', 62, 12.0, 2.0),
      createNote('D4', 62, 14.0, 1.0),
      createNote('G3', 55, 12.0, 3.0, false),
      createNote('B3', 59, 13.0, 2.0, false),

      // Measure 5
      createNote('G4', 67, 15.0, 2.0),
      createNote('B4', 71, 17.0, 0.5),
      createNote('G4', 67, 17.5, 0.5),
      createNote('G3', 55, 15.0, 3.0, false),
      createNote('D4', 62, 16.0, 2.0, false),

      // Measure 6
      createNote('B4', 71, 18.0, 2.0),
      createNote('A4', 69, 20.0, 1.0),
      createNote('G3', 55, 18.0, 3.0, false),
      createNote('D4', 62, 19.0, 2.0, false),

      // Measure 7
      createNote('D5', 74, 21.0, 2.0),
      createNote('D5', 74, 23.0, 1.0),
      createNote('D3', 50, 21.0, 3.0, false),
      createNote('F#3', 54, 22.0, 2.0, false),

      // Measure 8
      createNote('D5', 74, 24.0, 1.5),
      createNote('B4', 71, 25.5, 0.5),
      createNote('D5', 74, 26.0, 0.5),
      createNote('B4', 71, 26.5, 0.5),
      createNote('G3', 55, 24.0, 3.0, false),
      createNote('B3', 59, 25.0, 2.0, false),

      // Measure 9
      createNote('B4', 71, 27.0, 2.0),
      createNote('A4', 69, 29.0, 1.0),
      createNote('G3', 55, 27.0, 3.0, false),
      createNote('D4', 62, 28.0, 2.0, false),

      // Measure 10
      createNote('G4', 67, 30.0, 2.0),
      createNote('E4', 64, 32.0, 1.0),
      createNote('C3', 48, 30.0, 3.0, false),
      createNote('E4', 64, 31.0, 2.0, false),

      // Measure 11
      createNote('D4', 62, 33.0, 2.0),
      createNote('D4', 62, 35.0, 1.0),
      createNote('G3', 55, 33.0, 3.0, false),
      createNote('B3', 59, 34.0, 2.0, false),

      // Measure 12
      createNote('G4', 67, 36.0, 2.0),
      createNote('B4', 71, 38.0, 0.5),
      createNote('G4', 67, 38.5, 0.5),
      createNote('G3', 55, 36.0, 3.0, false),
      createNote('D4', 62, 37.0, 2.0, false),

      // Measure 13
      createNote('B4', 71, 39.0, 2.0),
      createNote('A4', 69, 41.0, 1.0),
      createNote('D3', 50, 39.0, 3.0, false),
      createNote('F#3', 54, 40.0, 2.0, false),

      // Measure 14-16 (Ending)
      createNote('G4', 67, 42.0, 6.0),
      createNote('B4', 71, 42.0, 6.0, false),
      createNote('D5', 74, 42.0, 6.0, false),
      createNote('G3', 55, 42.0, 6.0, false),
      createNote('D4', 62, 43.0, 5.0, false),
    ],
  },
  {
    id: 'you-raise-me-up',
    title: 'You Raise Me Up',
    titleJa: 'ユー・レイズ・ミー・アップ',
    composer: 'Rolf Løvland',
    timeSignature: '4/4',
    bpm: 56,
    description: '最初（Aメロ）から最後まで（サビ）感動的な旋律が美しく広がる全曲オルゴール譜。',
    iconName: 'Sun',
    notes: [
      // Verse: "When I am down and, oh my soul, so weary..."
      createNote('G3', 55, 3.0, 1.0),

      // Meas 1
      createNote('C4', 60, 4.0, 1.0),
      createNote('C4', 60, 5.0, 0.5),
      createNote('D4', 62, 5.5, 0.5),
      createNote('E4', 64, 6.0, 1.0),
      createNote('E4', 64, 7.0, 0.5),
      createNote('D4', 62, 7.5, 0.5),
      createNote('C3', 48, 4.0, 4.0, false),
      createNote('G3', 55, 6.0, 2.0, false),

      // Meas 2
      createNote('C4', 60, 8.0, 1.0),
      createNote('B3', 59, 9.0, 0.5),
      createNote('A3', 57, 9.5, 0.5),
      createNote('G3', 55, 10.0, 2.0),
      createNote('C3', 48, 8.0, 4.0, false),
      createNote('E3', 52, 10.0, 2.0, false),

      // Meas 3: "When troubles come and my heart burdened be..."
      createNote('G3', 55, 11.5, 0.5),
      createNote('C4', 60, 12.0, 1.0),
      createNote('C4', 60, 13.0, 0.5),
      createNote('D4', 62, 13.5, 0.5),
      createNote('E4', 64, 14.0, 1.0),
      createNote('E4', 64, 15.0, 0.5),
      createNote('D4', 62, 15.5, 0.5),
      createNote('A2', 45, 12.0, 4.0, false),
      createNote('E3', 52, 14.0, 2.0, false),

      // Meas 4
      createNote('C4', 60, 16.0, 1.0),
      createNote('D4', 62, 17.0, 0.5),
      createNote('E4', 64, 17.5, 0.5),
      createNote('D4', 62, 18.0, 2.0),
      createNote('G2', 43, 16.0, 4.0, false),
      createNote('D3', 50, 18.0, 2.0, false),

      // Meas 5: "Then, I am still and wait here in the silence..."
      createNote('G4', 67, 19.5, 0.5),
      createNote('G4', 67, 20.0, 1.0),
      createNote('F4', 65, 21.0, 0.5),
      createNote('E4', 64, 21.5, 0.5),
      createNote('D4', 62, 22.0, 1.0),
      createNote('C4', 60, 23.0, 0.5),
      createNote('B3', 59, 23.5, 0.5),
      createNote('F3', 53, 20.0, 4.0, false),
      createNote('C4', 60, 22.0, 2.0, false),

      // Meas 6
      createNote('A3', 57, 24.0, 1.0),
      createNote('B3', 59, 25.0, 0.5),
      createNote('C4', 60, 25.5, 0.5),
      createNote('G3', 55, 26.0, 2.0),
      createNote('C3', 48, 24.0, 4.0, false),
      createNote('G3', 55, 26.0, 2.0, false),

      // Meas 7: "Until you come and sit a while with me..."
      createNote('G3', 55, 27.5, 0.5),
      createNote('C4', 60, 28.0, 1.0),
      createNote('C4', 60, 29.0, 0.5),
      createNote('B3', 59, 29.5, 0.5),
      createNote('C4', 60, 30.0, 1.0),
      createNote('D4', 62, 31.0, 1.0),
      createNote('F3', 53, 28.0, 2.0, false),
      createNote('G3', 55, 30.0, 2.0, false),

      // Meas 8
      createNote('C4', 60, 32.0, 3.0),
      createNote('G4', 67, 34.5, 0.5),
      createNote('A4', 69, 35.0, 0.5),
      createNote('C3', 48, 32.0, 4.0, false),

      // CHORUS: "You raise me up, so I can stand on mountains..."
      // Meas 9
      createNote('C5', 72, 36.0, 1.0),
      createNote('C5', 72, 37.0, 0.5),
      createNote('B4', 71, 37.5, 0.5),
      createNote('A4', 69, 38.0, 1.0),
      createNote('G4', 67, 39.0, 0.5),
      createNote('F4', 65, 39.5, 0.5),
      createNote('F3', 53, 36.0, 4.0, false),
      createNote('C4', 60, 38.0, 2.0, false),

      // Meas 10
      createNote('E4', 64, 40.0, 1.0),
      createNote('F4', 65, 41.0, 0.5),
      createNote('G4', 67, 41.5, 0.5),
      createNote('E4', 64, 42.0, 2.0),
      createNote('C3', 48, 40.0, 4.0, false),
      createNote('G3', 55, 42.0, 2.0, false),

      // Meas 11: "You raise me up, to walk on stormy seas..."
      createNote('G4', 67, 43.5, 0.5),
      createNote('C5', 72, 44.0, 1.0),
      createNote('C5', 72, 45.0, 0.5),
      createNote('B4', 71, 45.5, 0.5),
      createNote('A4', 69, 46.0, 1.0),
      createNote('G4', 67, 47.0, 0.5),
      createNote('F4', 65, 47.5, 0.5),
      createNote('F3', 53, 44.0, 4.0, false),
      createNote('C4', 60, 46.0, 2.0, false),

      // Meas 12
      createNote('G4', 67, 48.0, 2.0),
      createNote('D5', 74, 50.0, 1.0),
      createNote('G4', 67, 51.0, 0.5),
      createNote('A4', 69, 51.5, 0.5),
      createNote('G3', 55, 48.0, 4.0, false),
      createNote('D4', 62, 50.0, 2.0, false),

      // Meas 13: "I am strong, when I am on your shoulders..."
      createNote('C5', 72, 52.0, 1.0),
      createNote('C5', 72, 53.0, 0.5),
      createNote('B4', 71, 53.5, 0.5),
      createNote('A4', 69, 54.0, 1.0),
      createNote('G4', 67, 55.0, 0.5),
      createNote('F4', 65, 55.5, 0.5),
      createNote('F3', 53, 52.0, 4.0, false),
      createNote('C4', 60, 54.0, 2.0, false),

      // Meas 14
      createNote('E4', 64, 56.0, 1.0),
      createNote('F4', 65, 57.0, 0.5),
      createNote('G4', 67, 57.5, 0.5),
      createNote('E4', 64, 58.0, 2.0),
      createNote('C3', 48, 56.0, 4.0, false),
      createNote('G3', 55, 58.0, 2.0, false),

      // Meas 15: "You raise me up to more than I can be."
      createNote('G3', 55, 59.5, 0.5),
      createNote('C4', 60, 60.0, 1.0),
      createNote('C4', 60, 61.0, 0.5),
      createNote('B3', 59, 61.5, 0.5),
      createNote('C4', 60, 62.0, 1.0),
      createNote('D4', 62, 63.0, 1.0),
      createNote('G3', 55, 60.0, 4.0, false),
      createNote('D4', 62, 62.0, 2.0, false),

      // Meas 16: Outro / Final resolution chord
      createNote('C4', 60, 64.0, 6.0),
      createNote('E4', 64, 64.0, 6.0, false),
      createNote('G4', 67, 64.0, 6.0, false),
      createNote('C5', 72, 64.0, 6.0, false),
      createNote('C3', 48, 64.0, 6.0, false),
    ],
  },
  {
    id: 'brahms-op118-no2',
    title: 'Intermezzo Op.118-2',
    titleJa: 'ブラームス 間奏曲 イ長調',
    composer: 'Johannes Brahms',
    timeSignature: '3/4',
    bpm: 52,
    description: 'ブラームス晩年の深い愛と郷愁に満ちた、美しく切ない名曲イ長調の間奏曲。',
    iconName: 'Music',
    notes: [
      // Pickup (3rd beat)
      createNote('C#5', 73, 2.0, 1.0),

      // Measure 1
      createNote('F#5', 78, 3.0, 1.0),
      createNote('E5', 76, 4.0, 1.0),
      createNote('D5', 74, 5.0, 0.5),
      createNote('C#5', 73, 5.5, 0.5),
      createNote('A2', 45, 3.0, 3.0, false),
      createNote('C#4', 61, 4.0, 2.0, false),
      createNote('A4', 69, 4.0, 2.0, false),

      // Measure 2
      createNote('B4', 71, 6.0, 1.0),
      createNote('C#5', 73, 7.0, 1.0),
      createNote('D5', 74, 8.0, 1.0),
      createNote('D3', 50, 6.0, 3.0, false),
      createNote('B3', 59, 7.0, 2.0, false),
      createNote('F#4', 66, 7.0, 2.0, false),

      // Measure 3
      createNote('C#5', 73, 9.0, 1.0),
      createNote('B4', 71, 10.0, 1.0),
      createNote('A4', 69, 11.0, 0.5),
      createNote('G#4', 68, 11.5, 0.5),
      createNote('E3', 52, 9.0, 3.0, false),
      createNote('E4', 64, 10.0, 2.0, false),
      createNote('G#4', 68, 10.0, 2.0, false),

      // Measure 4
      createNote('F#4', 66, 12.0, 2.0),
      createNote('C#5', 73, 14.0, 1.0),
      createNote('A2', 45, 12.0, 3.0, false),
      createNote('C#4', 61, 13.0, 2.0, false),

      // Measure 5 (Phrase 2)
      createNote('F#5', 78, 15.0, 1.0),
      createNote('E5', 76, 16.0, 1.0),
      createNote('D5', 74, 17.0, 0.5),
      createNote('C#5', 73, 17.5, 0.5),
      createNote('A2', 45, 15.0, 3.0, false),
      createNote('C#4', 61, 16.0, 2.0, false),
      createNote('A4', 69, 16.0, 2.0, false),

      // Measure 6
      createNote('B4', 71, 18.0, 1.0),
      createNote('C#5', 73, 19.0, 1.0),
      createNote('D5', 74, 20.0, 1.0),
      createNote('D3', 50, 18.0, 3.0, false),
      createNote('F#4', 66, 19.0, 2.0, false),

      // Measure 7 (Climax ascent)
      createNote('E5', 76, 21.0, 1.0),
      createNote('F#5', 78, 22.0, 1.0),
      createNote('G#5', 80, 23.0, 1.0),
      createNote('E3', 52, 21.0, 3.0, false),
      createNote('G#4', 68, 22.0, 2.0, false),

      // Measure 8
      createNote('A5', 81, 24.0, 2.0),
      createNote('E5', 76, 26.0, 1.0),
      createNote('A2', 45, 24.0, 3.0, false),
      createNote('C#4', 61, 25.0, 2.0, false),

      // Measure 9 (Descent)
      createNote('F#5', 78, 27.0, 1.0),
      createNote('E5', 76, 28.0, 1.0),
      createNote('D5', 74, 29.0, 1.0),
      createNote('D3', 50, 27.0, 3.0, false),
      createNote('F#4', 66, 28.0, 2.0, false),

      // Measure 10
      createNote('C#5', 73, 30.0, 1.0),
      createNote('B4', 71, 31.0, 1.0),
      createNote('A4', 69, 32.0, 1.0),
      createNote('E3', 52, 30.0, 3.0, false),
      createNote('G#4', 68, 31.0, 2.0, false),

      // Measure 11-12 (Harmonic Resolution)
      createNote('A4', 69, 33.0, 3.0),
      createNote('C#5', 73, 33.0, 3.0, false),
      createNote('E5', 76, 33.0, 3.0, false),
      createNote('A2', 45, 33.0, 6.0, false),

      createNote('A3', 57, 36.0, 3.0),
      createNote('C#4', 61, 36.0, 3.0, false),
      createNote('E4', 64, 36.0, 3.0, false),
      createNote('A4', 69, 36.0, 3.0, false),
    ],
  },
  {
    id: 'brahms-concerto1-adagio',
    title: 'Piano Concerto No.1 Adagio',
    titleJa: 'ブラームス ピアノ協奏曲第1番 アダージョ',
    composer: 'Johannes Brahms',
    timeSignature: '6/4',
    bpm: 46,
    description: '「祈り（Benedictus）」と題された、静寂と気品に満ちた感動的なピアノ独奏主題。',
    iconName: 'Sparkles',
    notes: [
      // Measure 1 (D Major 6/4 - Gentle Prayer theme)
      createNote('F#4', 66, 0.0, 2.0),
      createNote('A4', 69, 2.0, 2.0),
      createNote('D5', 74, 4.0, 2.0),
      createNote('D3', 50, 0.0, 6.0, false),
      createNote('F#3', 54, 2.0, 4.0, false),
      createNote('A3', 57, 2.0, 4.0, false),

      // Measure 2
      createNote('C#5', 73, 6.0, 3.0),
      createNote('B4', 71, 9.0, 1.0),
      createNote('A4', 69, 10.0, 2.0),
      createNote('A2', 45, 6.0, 6.0, false),
      createNote('E3', 52, 8.0, 4.0, false),
      createNote('G3', 55, 8.0, 4.0, false),

      // Measure 3
      createNote('G4', 67, 12.0, 2.0),
      createNote('F#4', 66, 14.0, 2.0),
      createNote('E4', 64, 16.0, 2.0),
      createNote('D3', 50, 12.0, 6.0, false),
      createNote('F#3', 54, 14.0, 4.0, false),

      // Measure 4
      createNote('F#4', 66, 18.0, 4.0),
      createNote('E4', 64, 22.0, 2.0),
      createNote('A2', 45, 18.0, 6.0, false),
      createNote('C#3', 49, 20.0, 4.0, false),
      createNote('E3', 52, 20.0, 4.0, false),

      // Measure 5 (Ascending hymn-like passage)
      createNote('F#4', 66, 24.0, 2.0),
      createNote('A4', 69, 26.0, 2.0),
      createNote('D5', 74, 28.0, 2.0),
      createNote('D3', 50, 24.0, 6.0, false),
      createNote('A3', 57, 26.0, 4.0, false),

      // Measure 6 (Climax to high F#5)
      createNote('E5', 76, 30.0, 2.0),
      createNote('F#5', 78, 32.0, 3.0),
      createNote('E5', 76, 35.0, 1.0),
      createNote('G3', 55, 30.0, 6.0, false),
      createNote('B3', 59, 32.0, 4.0, false),
      createNote('D4', 62, 32.0, 4.0, false),

      // Measure 7
      createNote('D5', 74, 36.0, 2.0),
      createNote('C#5', 73, 38.0, 2.0),
      createNote('B4', 71, 40.0, 2.0),
      createNote('A2', 45, 36.0, 6.0, false),
      createNote('E3', 52, 38.0, 4.0, false),
      createNote('G3', 55, 38.0, 4.0, false),

      // Measure 8 (Peaceful Resolution)
      createNote('D5', 74, 42.0, 6.0),
      createNote('F#4', 66, 42.0, 6.0, false),
      createNote('A4', 69, 42.0, 6.0, false),
      createNote('D3', 50, 42.0, 6.0, false),
      createNote('F#3', 54, 44.0, 4.0, false),
      createNote('A3', 57, 44.0, 4.0, false),
    ],
  },
  {
    id: 'clair-de-lune',
    title: 'Clair de Lune',
    titleJa: '月の光',
    composer: 'Claude Debussy',
    timeSignature: '9/8',
    bpm: 52,
    description: '月光がやさしく降り注ぐような幻想的な美しいトーン。',
    iconName: 'Sun',
    notes: [
      createNote('F#5', 78, 0.0, 1.5),
      createNote('Eb5', 75, 1.5, 1.5),
      createNote('Db5', 73, 3.0, 3.0),
      createNote('C5', 72, 6.0, 1.5),
      createNote('Bb4', 70, 7.5, 1.5),
      createNote('Ab4', 68, 9.0, 3.0),

      createNote('F4', 65, 12.0, 1.5),
      createNote('Ab4', 68, 13.5, 1.5),
      createNote('C5', 72, 15.0, 1.5),
      createNote('Eb5', 75, 16.5, 1.5),
      createNote('F5', 77, 18.0, 3.0),
    ],
  },
];
