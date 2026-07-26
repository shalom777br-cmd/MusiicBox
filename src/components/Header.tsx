import React from 'react';
import { Play, Sparkles } from 'lucide-react';

interface HeaderProps {
  onTestSound?: () => void;
}

export default function Header({ onTestSound }: HeaderProps) {
  const [isPlayingTest, setIsPlayingTest] = React.useState(false);

  const handleClickTest = () => {
    if (onTestSound) {
      setIsPlayingTest(true);
      onTestSound();
      setTimeout(() => {
        setIsPlayingTest(false);
      }, 1000);
    }
  };

  return (
    <header className="relative bg-[#1c0f0a] border-b border-[#3d251a] py-5 px-6 sm:px-10 text-[#e5d3b3]">
      {/* Decorative Top Gold Trim */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c19a6b] to-transparent opacity-80" />

      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 bg-[#c19a6b] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(193,154,107,0.3)] shrink-0">
            <div className="w-5 h-5 border-2 border-[#1c0f0a] rounded-sm rotate-45 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-[#1c0f0a]" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif italic tracking-wide text-[#c19a6b]">
                ジョアンナのオルゴール
              </h1>
              <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#2d1b14] border border-[#3d251a] text-[#c19a6b]">
                オルゴール生成
              </span>
            </div>
            <p className="text-xs text-[#e5d3b3]/70 mt-0.5 font-light">
              楽譜を読み込んで美しいオルゴール音色へ自動変換・再生・保存
            </p>
          </div>
        </div>

        {/* Top Header Action: Safari 互換 試聴再生ボタン */}
        {onTestSound && (
          <button
            onClick={handleClickTest}
            className={`flex items-center space-x-2 text-xs px-4 py-2 rounded-full font-bold transition-all shadow-md cursor-pointer active:scale-95 ${
              isPlayingTest
                ? 'bg-[#e5d3b3] text-[#1c0f0a] scale-105'
                : 'bg-[#c19a6b] hover:bg-[#d4ad7d] text-[#1c0f0a]'
            }`}
            title="Safari / iOS対応の試聴再生・音声を有効化"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPlayingTest ? '♪ 試聴テスト再生中...' : '▶ Safari 試聴再生・音声有効化'}</span>
          </button>
        )}
      </div>
    </header>
  );
}


