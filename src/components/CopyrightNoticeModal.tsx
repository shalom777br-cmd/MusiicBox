import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CopyrightNoticeModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#2d1b14] border border-[#3d251a] rounded-[32px] max-w-lg w-full p-6 sm:p-8 text-[#e5d3b3] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#c19a6b] hover:text-[#e5d3b3] p-2 rounded-full bg-[#1c0f0a] border border-[#3d251a] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5 border-b border-[#3d251a] pb-4">
          <div className="w-10 h-10 rounded-full bg-[#1c0f0a] border border-[#3d251a] flex items-center justify-center text-[#c19a6b]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-serif italic text-[#c19a6b]">
              著作権およびご利用ガイドライン
            </h3>
            <p className="text-xs text-[#e5d3b3]/60">
              安心・安全にオルゴール化機能をお楽しみいただくために
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-[#e5d3b3]/90 leading-relaxed">
          <div className="p-4 bg-[#1c0f0a] rounded-2xl border border-[#3d251a] flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-[#c19a6b] shrink-0 mt-0.5" />
            <p>
              本アプリは、ユーザー様が著作権を所有している自作曲、またはパブリックドメイン（著作権保護期間が満了した古典楽曲など）の楽譜のアップロードを前提としています。
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[#c19a6b] flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#c19a6b]" />
              <span>推奨される楽曲例</span>
            </h4>
            <ul className="list-disc list-inside pl-2 space-y-1 text-[#e5d3b3]/80">
              <li>パッヘルベル「カノン」、ベートーヴェン「エリゼのために」等のクラシック名曲</li>
              <li>ユーザー自身が作曲・編曲したオリジナル楽譜</li>
              <li>著作権Free/クリエイティブ・コモンズライセンスの楽譜データ</li>
            </ul>
          </div>

          <div className="p-3.5 bg-[#1c0f0a]/60 rounded-2xl border border-[#3d251a] text-[#e5d3b3]/70 text-[11px] leading-normal">
            ※ 第三者が著作権を有する市販楽譜や最新ポップス等を読み込む場合は、個人での私的試聴の範囲内でご活用ください。
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#c19a6b] hover:bg-[#d4ac7d] text-[#1c0f0a] font-bold rounded-full shadow-md transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            理解して閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
