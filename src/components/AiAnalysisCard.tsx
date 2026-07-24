import React from 'react';
import { Sparkles, Brain, CheckCircle2, Music2, AlertTriangle } from 'lucide-react';
import { ScoreMeta } from '../types';

interface AiAnalysisCardProps {
  meta: ScoreMeta;
  commentary?: string;
}

export default function AiAnalysisCard({ meta, commentary }: AiAnalysisCardProps) {
  if (!meta.summary && !commentary) return null;

  return (
    <div className="bg-[#2d1b14] border border-[#3d251a] rounded-[32px] p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex items-center space-x-3 border-b border-[#3d251a] pb-3.5">
        <div className="w-10 h-10 rounded-full bg-[#1c0f0a] border border-[#3d251a] flex items-center justify-center text-[#c19a6b]">
          <Brain className="w-5 h-5 text-[#c19a6b] animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-serif italic text-[#c19a6b] flex items-center space-x-2">
            <span>④ AI自動最適化・オルゴール編曲解析</span>
            <span className="text-[10px] px-2.5 py-0.5 bg-[#1c0f0a] border border-[#3d251a] text-[#c19a6b] rounded-full uppercase tracking-wider font-mono">
              Gemini 2.5 Flash
            </span>
          </h3>
          <p className="text-xs text-[#e5d3b3]/60">
            楽譜の特徴とオルゴール弁（Comb）物理構造に合わせたAI最適化アドバイス
          </p>
        </div>
      </div>

      <div className="space-y-3 text-xs text-[#e5d3b3]/90 leading-relaxed">
        {meta.summary && (
          <div className="p-4 bg-[#1c0f0a] rounded-2xl border border-[#3d251a]">
            <span className="font-bold text-[#c19a6b] block mb-1">【楽譜解析サマリー】</span>
            <p className="text-[#e5d3b3]/80">{meta.summary}</p>
          </div>
        )}

        {commentary && (
          <div className="p-4 bg-[#1c0f0a] rounded-2xl border border-[#3d251a] space-y-1.5">
            <span className="font-bold text-[#c19a6b] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#c19a6b]" />
              <span>【オルゴール編曲ポイント解説】</span>
            </span>
            <p className="text-[#e5d3b3]/90 whitespace-pre-line leading-relaxed">{commentary}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-[11px] pt-1">
          <span className="px-3 py-1 bg-[#1c0f0a] rounded-full border border-[#3d251a] text-[#c19a6b] flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span>同音高速連打の打鍵衝突を修正</span>
          </span>
          <span className="px-3 py-1 bg-[#1c0f0a] rounded-full border border-[#3d251a] text-[#c19a6b] flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#c19a6b]" />
            <span>オルゴール鳴り響き音域（2-3オクターブ）へ自動アサイン</span>
          </span>
        </div>
      </div>
    </div>
  );
}
