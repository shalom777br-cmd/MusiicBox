import React, { useState, useRef } from 'react';
import {
  Upload,
  FileMusic,
  FileImage,
  FileText,
  Sparkles,
  Music,
  Loader2,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SAMPLE_SONGS } from '../data/sampleSongs';
import { MusicNote, ScoreMeta, SamplePreset } from '../types';
import { parseMusicXML, parseMIDIBuffer } from '../utils/musicParsers';

interface ScoreUploadProps {
  onScoreLoaded: (meta: ScoreMeta, notes: MusicNote[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  activeSongId?: string;
}

export default function ScoreUpload({
  onScoreLoaded,
  isLoading,
  setIsLoading,
  activeSongId,
}: ScoreUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Preset Sample Song Selection
  const handleSelectSample = (sample: SamplePreset) => {
    setErrorMsg(null);
    setUploadStatus(`「${sample.titleJa}」をロード中...`);
    onScoreLoaded(
      {
        title: sample.titleJa,
        composer: sample.composer,
        timeSignature: sample.timeSignature,
        originalBpm: sample.bpm,
        keySignature: 'C Major',
        summary: `${sample.description}（${sample.notes.length}音）`,
      },
      sample.notes
    );
    setUploadStatus(null);
  };

  // Process File Upload (PDF, JPG, PNG, MusicXML, MIDI)
  const processFile = async (file: File) => {
    setErrorMsg(null);
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();

    setIsLoading(true);
    setUploadStatus(`「${fileName}」を解析中...`);

    try {
      // 1. MIDI File (.mid, .midi) -> Client Parsing
      if (ext === 'mid' || ext === 'midi') {
        const arrayBuffer = await file.arrayBuffer();
        const { notes, bpm } = parseMIDIBuffer(arrayBuffer);

        if (notes.length === 0) {
          throw new Error('MIDIファイルから音符データを検出できませんでした。');
        }

        onScoreLoaded(
          {
            title: fileName.replace(/\.[^/.]+$/, ''),
            composer: 'MIDIファイル',
            timeSignature: '4/4',
            originalBpm: bpm || 72,
            keySignature: 'Unknown',
            summary: `MIDIトラック解析完了: 全${notes.length}音を抽出しオルゴール向けにフォーマットしました。`,
          },
          notes
        );
        setUploadStatus(null);
        setIsLoading(false);
        return;
      }

      // 2. MusicXML File (.xml, .musicxml) -> Client Parsing
      if (ext === 'xml' || ext === 'musicxml') {
        const text = await file.text();
        const { meta, notes } = parseMusicXML(text);

        if (notes.length === 0) {
          throw new Error('MusicXMLから音符データを読み込めませんでした。');
        }

        onScoreLoaded(
          {
            title: meta.title || fileName,
            composer: meta.composer || '不明',
            timeSignature: meta.timeSignature || '4/4',
            originalBpm: meta.originalBpm || 72,
            keySignature: 'C Major',
            summary: `MusicXML解析完了: 全${notes.length}音の楽譜要素を検出しました。`,
          },
          notes
        );
        setUploadStatus(null);
        setIsLoading(false);
        return;
      }

      // 3. Image (JPG, PNG) or PDF -> Server Gemini AI Multimodal OCR Parsing!
      if (['jpg', 'jpeg', 'png', 'pdf', 'webp'].includes(ext || '')) {
        setUploadStatus('Gemini AIが楽譜画像をAI OCR解析中...');

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string;
            const base64Data = dataUrl.split(',')[1];
            const mimeType = file.type || (ext === 'pdf' ? 'application/pdf' : 'image/png');

            const response = await fetch('/api/parse-music', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileData: base64Data,
                mimeType,
                fileName,
              }),
            });

            const resText = await response.text();
            let resData: any = null;
            try {
              resData = JSON.parse(resText);
            } catch (jsonErr) {
              if (response.status === 413) {
                throw new Error('ファイルサイズが大きすぎます。容量の小さい画像またはPDFをお試しください。');
              }
              throw new Error(`AI解析サーバーの応答読み込みエラー (${response.status})。しばらく時間をおいて再度お試しください。`);
            }

            if (!response.ok || !resData?.success || !resData?.data?.notes?.length) {
              throw new Error(resData?.error || 'Gemini AIによる楽譜認識に失敗しました。別の画像ファイルをお試しください。');
            }

            const parsed = resData.data;

            onScoreLoaded(
              {
                title: parsed.title || fileName.replace(/\.[^/.]+$/, ''),
                composer: parsed.composer || '楽譜解析結果',
                timeSignature: parsed.timeSignature || '4/4',
                originalBpm: parsed.bpm || 72,
                keySignature: parsed.keySignature || 'C Major',
                summary: parsed.summary || 'AI解析完了: メロディ音符を抽出しました。',
              },
              parsed.notes
            );

            setUploadStatus(null);
            setIsLoading(false);
          } catch (err: any) {
            setErrorMsg(err.message || 'AI解析エラーが発生しました。');
            setIsLoading(false);
            setUploadStatus(null);
          }
        };

        reader.onerror = () => {
          setErrorMsg('ファイルの読み込みに失敗しました。');
          setIsLoading(false);
          setUploadStatus(null);
        };
        return;
      }

      throw new Error('対応していないファイル形式です。(PDF, JPG, PNG, MusicXML, MIDIに対応)');
    } catch (err: any) {
      setErrorMsg(err.message || 'ファイル処理中にエラーが発生しました。');
      setIsLoading(false);
      setUploadStatus(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-[#2d1b14] border border-[#3d251a] rounded-2xl p-3.5 sm:p-4 shadow-lg backdrop-blur-md space-y-3">
      {/* Upload Drag & Drop Area (Compact horizontal layout) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border border-dashed rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 transition-all cursor-pointer ${
          isDragging
            ? 'border-[#c19a6b] bg-[#1c0f0a]/90 shadow-md'
            : 'border-[#3d251a] hover:border-[#c19a6b]/50 bg-[#1c0f0a] hover:bg-[#1c0f0a]/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xml,.musicxml,.mid,.midi"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex items-center justify-center space-x-3 py-1.5">
            <Loader2 className="w-5 h-5 text-[#c19a6b] animate-spin" />
            <div className="text-left">
              <p className="text-xs font-semibold text-[#e5d3b3]">{uploadStatus}</p>
              <p className="text-[10px] text-[#c19a6b]">AIが全音符・全小節を抽出中...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 text-left">
              <div className="w-8 h-8 rounded-full bg-[#2d1b14] flex items-center justify-center border border-[#c19a6b]/40 text-[#c19a6b] shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xs font-bold text-[#c19a6b] tracking-wide">① 楽譜読み込み</h2>
                  <span className="text-[10px] text-[#e5d3b3]/50">PDF・画像・MusicXML・MIDI</span>
                </div>
                <p className="text-[11px] text-[#e5d3b3]/80">
                  楽譜ファイルをドラッグ＆ドロップ、またはファイルを選択
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3.5 py-1.5 bg-[#c19a6b] hover:bg-[#d4ac7d] text-[#1c0f0a] rounded-full font-bold text-[11px] uppercase tracking-wider transition-opacity cursor-pointer shadow-sm"
              >
                ファイルを選択
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preset Sample Songs Compact Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-[#3d251a]/60">
        <span className="text-[11px] font-serif italic text-[#c19a6b] flex items-center space-x-1 shrink-0">
          <Sparkles className="w-3 h-3 text-[#c19a6b]" />
          <span>サンプル名曲（ワンクリックロード）:</span>
        </span>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 w-full sm:w-auto">
          {SAMPLE_SONGS.map((song) => {
            const isActive = activeSongId === song.id;
            return (
              <button
                key={song.id}
                onClick={() => handleSelectSample(song)}
                className={`px-2 py-1 rounded-lg border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] font-bold shadow-xs'
                    : 'bg-[#1c0f0a] hover:bg-[#3d251a]/50 border-[#3d251a] text-[#e5d3b3]/75 hover:border-[#c19a6b]/40'
                }`}
              >
                <div className="truncate text-[10px] text-[#c19a6b] leading-tight">
                  {song.composer}
                </div>
                <div className="truncate text-[11px] font-medium leading-tight">
                  {song.titleJa}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
