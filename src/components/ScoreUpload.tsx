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

            const resData = await response.json();

            if (!resData.success || !resData.data?.notes?.length) {
              throw new Error(resData.error || 'Gemini AIによる楽譜認識に失敗しました。');
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
    <div className="bg-[#2d1b14] border border-[#3d251a] rounded-[32px] p-6 sm:p-8 shadow-xl backdrop-blur-md">
      {/* Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#1c0f0a] border border-[#3d251a] flex items-center justify-center text-[#c19a6b]">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif italic text-[#c19a6b]">① 楽譜の読み込み</h2>
            <p className="text-xs text-[#e5d3b3]/60">
              ファイル（PDF・画像・MusicXML・MIDI）のアップロード、またはサンプル名曲を選択
            </p>
          </div>
        </div>
      </div>

      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[24px] p-6 sm:p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#c19a6b] bg-[#1c0f0a]/80 shadow-lg scale-[1.01]'
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
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <Loader2 className="w-8 h-8 text-[#c19a6b] animate-spin" />
            <p className="text-sm font-medium text-[#e5d3b3]">{uploadStatus}</p>
            <p className="text-xs text-[#e5d3b3]/50">AIが音符・主旋律を抽出しています...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#2d1b14] flex items-center justify-center border border-[#c19a6b]/30 text-[#c19a6b]">
              <FileMusic className="w-7 h-7" />
            </div>
            <p className="font-serif text-base italic text-[#e5d3b3]">
              楽譜ファイル（PDF, JPG, PNG, MusicXML, MIDI）をドラッグ＆ドロップ
            </p>
            <p className="text-xs text-[#e5d3b3]/50">
              または <span className="text-[#c19a6b] underline font-semibold">ファイルを選択</span>
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-1 px-6 py-2 bg-[#c19a6b] text-[#1c0f0a] rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Browse Files
            </button>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] text-[#e5d3b3]/40">
              <span className="px-2.5 py-0.5 bg-[#1c0f0a] rounded-full border border-[#3d251a]">PDF / 画像 (AI OCR)</span>
              <span className="px-2.5 py-0.5 bg-[#1c0f0a] rounded-full border border-[#3d251a]">MusicXML</span>
              <span className="px-2.5 py-0.5 bg-[#1c0f0a] rounded-full border border-[#3d251a]">MIDI (.mid)</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-3 p-3 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preset Sample Songs Selection */}
      <div className="mt-6 border-t border-[#3d251a] pt-4">
        <p className="text-xs font-serif italic text-[#c19a6b] mb-3 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#c19a6b]" />
          <span>サンプル名曲で今すぐ試聴（ワンクリック）:</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {SAMPLE_SONGS.map((song) => {
            const isActive = activeSongId === song.id;
            return (
              <button
                key={song.id}
                onClick={() => handleSelectSample(song)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-[#c19a6b]/20 border-[#c19a6b] text-[#e5d3b3] shadow-md'
                    : 'bg-[#1c0f0a] hover:bg-[#3d251a]/40 border-[#3d251a] text-[#e5d3b3]/80 hover:border-[#c19a6b]/40'
                }`}
              >
                <div>
                  <span className="text-[10px] text-[#c19a6b] font-serif block truncate">
                    {song.composer}
                  </span>
                  <span className="text-xs font-medium block truncate mt-0.5">
                    {song.titleJa}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#e5d3b3]/50">
                  <span>{song.timeSignature}</span>
                  {isActive && <Check className="w-3 h-3 text-[#c19a6b]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
