import React from 'react';
import { Sparkles, BookOpen } from 'lucide-react';

interface HeaderProps {
  onOpenLibrary?: () => void;
}

export default function Header({ onOpenLibrary }: HeaderProps) {
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

        {/* Right side controls: Library Button */}
        {onOpenLibrary && (
          <button
            onClick={onOpenLibrary}
            className="px-4 py-2 bg-[#2d1b14] hover:bg-[#3d251a] border border-[#3d251a] hover:border-[#c19a6b]/50 text-[#e5d3b3] hover:text-[#c19a6b] rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#c19a6b]" />
            <span>マイ書庫 (履歴)</span>
          </button>
        )}
      </div>
    </header>
  );
}


