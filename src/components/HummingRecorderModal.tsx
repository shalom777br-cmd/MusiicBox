import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, Sparkles, X, Music, Check, Volume2, AlertCircle, Loader2 } from 'lucide-react';
import { MusicNote, ScoreMeta } from '../types';

interface HummingRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadNotes: (notes: MusicNote[], meta: ScoreMeta) => void;
}

export default function HummingRecorderModal({
  isOpen,
  onClose,
  onLoadNotes,
}: HummingRecorderModalProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded' | 'analyzing'>('idle');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state after analysis
  const [analyzedResult, setAnalyzedResult] = useState<{
    title: string;
    bpm: number;
    keySignature: string;
    summary: string;
    notes: MusicNote[];
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on modal close
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setRecordingState('idle');
      setRecordingTime(0);
      setAudioUrl(null);
      setAudioBlob(null);
      setAnalyzedResult(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const startRecording = async () => {
    setErrorMessage(null);
    setAnalyzedResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Prefer webm/opus or mp4
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordingState('recorded');

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setRecordingState('recording');
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 20) {
            // Auto stop at 20 seconds
            stopRecording();
            return 20;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Failed to access microphone', err);
      setErrorMessage(
        'マイクへのアクセスが許可されていません。ブラウザのマイク許可設定を確認してください。'
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePlayAudio = () => {
    if (!audioUrl) return;
    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
      }
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Analyze recorded humming with Gemini API
  const handleAnalyzeWithGemini = async () => {
    if (!audioBlob) return;

    setRecordingState('analyzing');
    setStatusMessage('🎤 鼻歌の音声をGemini AIに送信中...');
    setErrorMessage(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const mimeType = audioBlob.type || 'audio/webm';

          setStatusMessage('🎶 Geminiが鼻歌の音程とリズムを解析中...');

          const res = await fetch('/api/parse-humming', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType,
            }),
          });

          const json = await res.json();
          if (json.success && json.data) {
            const data = json.data;
            const formattedNotes: MusicNote[] = (data.notes || []).map((n: any, idx: number) => ({
              id: `hum_${Date.now()}_${idx}`,
              pitch: n.pitch || 'C4',
              midiNumber: n.midiNumber || 60,
              startTime: typeof n.startTime === 'number' ? n.startTime : idx,
              duration: typeof n.duration === 'number' ? n.duration : 1,
              velocity: n.velocity || 90,
              isMelody: true,
            }));

            setAnalyzedResult({
              title: data.title || '鼻歌のオリジナル曲',
              bpm: data.bpm || 80,
              keySignature: data.keySignature || 'C Major',
              summary: data.summary || '鼻歌からオルゴールメロディを読み込みました！',
              notes: formattedNotes,
            });

            setRecordingState('recorded');
            setStatusMessage('');
          } else {
            throw new Error(json.error || '解析に失敗しました。');
          }
        } catch (err: any) {
          console.error('Error analyzing audio', err);
          setErrorMessage(err.message || '鼻歌の解析処理に失敗しました。');
          setRecordingState('recorded');
        }
      };
    } catch (err: any) {
      console.error('Failed to convert blob to base64', err);
      setErrorMessage('音声データの処理に失敗しました。');
      setRecordingState('recorded');
    }
  };

  const handleApplyToScore = () => {
    if (!analyzedResult) return;
    onLoadNotes(analyzedResult.notes, {
      title: analyzedResult.title,
      composer: '鼻歌 (Humming AI)',
      originalBpm: analyzedResult.bpm,
      timeSignature: '4/4',
      keySignature: analyzedResult.keySignature,
      summary: analyzedResult.summary,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#23130c] border-2 border-[#c19a6b] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-6 text-[#e5d3b3] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#e5d3b3]/60 hover:text-[#e5d3b3] p-1.5 rounded-xl hover:bg-[#3d251a] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-[#c19a6b]/30 pb-4">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#c19a6b] to-[#8b5a2b] text-[#1c0f0a] shadow-lg">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-[#e5d3b3]">鼻歌からオルゴール作成</h3>
            <p className="text-xs text-[#e5d3b3]/60">Gemini AIがマイクの鼻歌を聞き取って楽譜にします</p>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#3d1515] border border-[#e55353] text-[#ff8080] text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#e55353]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Interactive Stage */}
        <div className="bg-[#170c08] border border-[#3d251a] rounded-2xl p-6 text-center space-y-5">
          {recordingState === 'idle' && (
            <div className="space-y-4 py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#25150d] border-2 border-[#c19a6b]/50 flex items-center justify-center text-[#c19a6b] shadow-inner">
                <Mic className="w-10 h-10 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-base text-[#e5d3b3]">「ふんふん♪」と好きなメロディを歌ってください</p>
                <p className="text-xs text-[#e5d3b3]/60 mt-1">
                  （ドレミでも鼻歌でもOK・最大20秒間録音）
                </p>
              </div>
              <button
                onClick={startRecording}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-[#c19a6b] to-[#d4ac7d] text-[#1c0f0a] font-bold text-sm shadow-xl hover:brightness-110 flex items-center space-x-2 mx-auto cursor-pointer transition-all hover:scale-105"
              >
                <Mic className="w-4 h-4" />
                <span>録音を開始する</span>
              </button>
            </div>
          )}

          {recordingState === 'recording' && (
            <div className="space-y-4 py-4">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#e55353]/20 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-[#e55353] text-white flex items-center justify-center shadow-lg z-10">
                  <Mic className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#e55353]/20 border border-[#e55353] text-[#e55353] text-xs font-bold animate-pulse mb-2">
                  REC 録音中... {recordingTime}s / 20s
                </span>
                <p className="text-xs text-[#e5d3b3]/70">マイクに向かって鼻歌を歌ってください</p>
              </div>

              {/* Sound Wave Animation Visualizer */}
              <div className="flex items-center justify-center space-x-1.5 h-8 pt-2">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-[#c19a6b] rounded-full animate-pulse"
                    style={{
                      height: `${12 + Math.sin(i + recordingTime * 3) * 16}px`,
                      animationDuration: `${0.4 + (i % 3) * 0.2}s`,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={stopRecording}
                className="px-6 py-2.5 rounded-full bg-[#3d251a] hover:bg-[#523223] border border-[#c19a6b]/60 text-[#e5d3b3] font-bold text-xs flex items-center space-x-2 mx-auto cursor-pointer transition-all"
              >
                <Square className="w-4 h-4 fill-current text-[#e55353]" />
                <span>録音を停止する</span>
              </button>
            </div>
          )}

          {recordingState === 'recorded' && !analyzedResult && (
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-xl bg-[#25150d] border border-[#c19a6b]/30 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={togglePlayAudio}
                    className="p-3 rounded-full bg-[#c19a6b] text-[#1c0f0a] hover:brightness-110 transition-all cursor-pointer shadow-md"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                  <div className="text-left">
                    <p className="font-bold text-sm text-[#e5d3b3]">録音完了 ({recordingTime}秒)</p>
                    <p className="text-xs text-[#e5d3b3]/60">ボタンを押して鼻歌を再生確認できます</p>
                  </div>
                </div>
                <button
                  onClick={startRecording}
                  className="p-2 rounded-xl bg-[#170c08] border border-[#3d251a] hover:border-[#c19a6b] text-[#e5d3b3]/80 hover:text-[#e5d3b3] text-xs flex items-center space-x-1 cursor-pointer"
                  title="もう一度録音し直す"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#c19a6b]" />
                  <span>撮り直す</span>
                </button>
              </div>

              <button
                onClick={handleAnalyzeWithGemini}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#c19a6b] via-[#d4ac7d] to-[#c19a6b] text-[#1c0f0a] font-extrabold text-sm shadow-xl hover:brightness-110 flex items-center justify-center space-x-2 cursor-pointer transition-all transform hover:scale-[1.02]"
              >
                <Sparkles className="w-5 h-5 text-[#1c0f0a] animate-spin" />
                <span>Geminiでオルゴール化 (AI解析)</span>
              </button>
            </div>
          )}

          {recordingState === 'analyzing' && (
            <div className="py-8 space-y-4">
              <Loader2 className="w-12 h-12 text-[#c19a6b] animate-spin mx-auto" />
              <div>
                <p className="font-bold text-base text-[#d4ac7d] animate-pulse">{statusMessage}</p>
                <p className="text-xs text-[#e5d3b3]/60 mt-1">
                  Geminiが鼻歌の音程・リズムをオルゴール用メロディに変換しています...
                </p>
              </div>
            </div>
          )}

          {analyzedResult && (
            <div className="space-y-4 py-2 text-left">
              <div className="p-4 rounded-xl bg-[#25150d] border-2 border-[#c19a6b] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-[#d4ac7d] flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-[#c19a6b]" />
                    {analyzedResult.title}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-[#c19a6b]/20 text-[#c19a6b] border border-[#c19a6b]/40 rounded-full font-bold">
                    {analyzedResult.notes.length} 音
                  </span>
                </div>
                <p className="text-xs text-[#e5d3b3]/80 leading-relaxed bg-[#170c08] p-2.5 rounded-lg border border-[#3d251a]">
                  {analyzedResult.summary}
                </p>
                <div className="text-[11px] text-[#e5d3b3]/60 flex items-center space-x-4 pt-1">
                  <span>テンポ: {analyzedResult.bpm} BPM</span>
                  <span>調: {analyzedResult.keySignature}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => {
                    setAnalyzedResult(null);
                    setRecordingState('idle');
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-[#170c08] border border-[#3d251a] hover:border-[#c19a6b] text-[#e5d3b3]/80 text-xs font-semibold cursor-pointer"
                >
                  撮り直す
                </button>
                <button
                  onClick={handleApplyToScore}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-[#c19a6b] to-[#d4ac7d] text-[#1c0f0a] font-bold text-xs shadow-lg hover:brightness-110 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>五線譜に反映して演奏</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer hint */}
        <div className="text-[11px] text-[#e5d3b3]/50 text-center">
          💡 歌ったメロディが五線譜に展開され、オルゴールプレイヤーやパンチカードで即座に演奏できます
        </div>
      </div>
    </div>
  );
}
