import React from 'react';
import { Volume2, ShieldCheck, Info } from 'lucide-react';

interface FooterProps {
  onOpenCopyrightModal: () => void;
  onTestSound?: () => void;
}

export default function Footer({ onOpenCopyrightModal, onTestSound }: FooterProps) {
  const [isPlayingTest, setIsPlayingTest] = React.useState(false);

  const handleClickTest = () => {
    if (onTestSound) {
      setIsPlayingTest(true);
      onTestSound();
      setTimeout(() => {
        setIsPlayingTest(false);
      }, 800);
    }
  };

  return (
    <footer className="mt-16 border-t border-[#3d251a] bg-[#140b07] py-10 px-6 sm:px-10 text-[#e5d3b3]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Copyright notice and usage guideline text */}
        <div className="flex items-start space-x-3 text-xs text-[#e5d3b3]/80 max-w-xl">
          <Info className="w-4 h-4 text-[#c19a6b] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[#c19a6b]">著作権およびご利用ガイドライン</p>
            <p className="leading-relaxed text-[11px] text-[#e5d3b3]/70">
              本アプリはパブリックドメイン（著作権保護期間満了した古典名曲など）や、ご自身が著作権を所有している自作曲のオルゴール変換を前提としています。個人での私的試聴の範囲でご活用ください。
            </p>
          </div>
        </div>

        {/* Buttons at the bottom: Sound Test & Copyright modal */}
        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          {onTestSound && (
            <button
              onClick={handleClickTest}
              className={`flex items-center space-x-2 text-xs px-4 py-2 rounded-full font-medium transition-all shadow-md cursor-pointer active:scale-95 ${
                isPlayingTest
                  ? 'bg-[#e5d3b3] text-[#1c0f0a] scale-105'
                  : 'bg-[#2d1b14] hover:bg-[#3d251a] border border-[#3d251a] text-[#c19a6b]'
              }`}
              title="クリックして音を鳴らす・有効化する"
            >
              <Volume2 className={`w-4 h-4 text-[#c19a6b] ${isPlayingTest ? 'animate-bounce' : ''}`} />
              <span>{isPlayingTest ? '♪ 再生テスト中...' : '🔔 音声テスト / 有効化'}</span>
            </button>
          )}

          <button
            onClick={onOpenCopyrightModal}
            className="flex items-center space-x-2 text-xs px-4 py-2 rounded-full bg-[#2d1b14] hover:bg-[#3d251a] border border-[#3d251a] text-[#c19a6b] hover:text-[#e5d3b3] transition-all shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#c19a6b]" />
            <span>著作権・ご利用ガイド</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-[#3d251a]/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#e5d3b3]/50">
        <span>© ジョアンナのオルゴール (Joanna Music Box Studio)</span>
        <span>Safari & iOS Web Audio Compatibility</span>
      </div>
    </footer>
  );
}
