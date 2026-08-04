import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Music, Clock, Play } from 'lucide-react';
import { getAllSongs, deleteSong, searchSongs, SavedSong } from '../lib/localStorage';
import { MusicBoxAudioEngine } from '../utils/audioEngine';
import { MusicNote, MusicBoxSettings } from '../types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSong: (notes: MusicNote[], meta: any, settings?: any, id?: string) => void;
  audioEngine: MusicBoxAudioEngine | null;
}

export function LibraryModal({ isOpen, onClose, onLoadSong, audioEngine }: LibraryModalProps) {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) loadSongs();
  }, [isOpen]);

  async function loadSongs() {
    setLoading(true);
    try {
      const results = searchQuery.trim()
        ? await searchSongs(searchQuery)
        : await getAllSongs();
      setSongs(results);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('この楽曲を削除しますか？')) return;
    await deleteSong(id);
    loadSongs();
  }

  function handleLoad(song: SavedSong) {
    onLoadSong(song.notes, song.meta, song.settings, song.id);
    onClose();
  }

  function handlePreview(notes: MusicNote[], e: React.MouseEvent) {
    e.stopPropagation();
    if (audioEngine && notes.length > 0) {
      audioEngine.unlockAudio();
      audioEngine.playSequence(notes, {});
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1c0f0a] border border-[#3d251a] text-[#f7f3e9] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3d251a] bg-[#25150d]">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[#e5d3b3]">
            <Music className="w-5 h-5 text-[#c19a6b]" />
            マイ書庫 (ローカル保存)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#3d251a] rounded-lg text-[#e5d3b3]/70 hover:text-[#e5d3b3] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#3d251a] bg-[#170c08]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c19a6b]/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSongs()}
              placeholder="曲名・作曲家名で検索..."
              className="w-full pl-10 pr-4 py-2 bg-[#25150d] border border-[#3d251a] rounded-lg text-sm text-[#f7f3e9] placeholder-[#e5d3b3]/40 focus:outline-none focus:border-[#c19a6b]"
            />
          </div>
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-[#e5d3b3]/50 text-sm">読み込み中...</div>
          ) : songs.length === 0 ? (
            <div className="text-center py-8 text-[#e5d3b3]/40">
              <Music className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-medium">保存された楽曲はありません</p>
              <p className="text-xs mt-1 text-[#e5d3b3]/30">楽曲を編集すると自動的にここに保存されます</p>
            </div>
          ) : (
            songs.map((song) => (
              <div
                key={song.id}
                onClick={() => handleLoad(song)}
                className="flex items-center gap-3 p-3 bg-[#25150d] border border-[#3d251a] hover:border-[#c19a6b]/50 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#f7f3e9] truncate group-hover:text-[#c19a6b] transition-colors">
                    {song.title || '無題'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#e5d3b3]/60 mt-1">
                    <span>{song.composer || '不明'}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#c19a6b]" />
                      {new Date(song.savedAt).toLocaleDateString('ja-JP')}
                    </span>
                    {song.copyrightStatus === 'warning' && (
                      <span className="text-red-400 font-medium">⚠ 著作権注意</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handlePreview(song.notes, e)}
                  className="p-2 bg-[#3d251a] hover:bg-[#c19a6b] text-[#e5d3b3] hover:text-[#1c0f0a] rounded-lg transition-colors"
                  title="再生試聴"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={() => handleLoad(song)}
                  className="px-3 py-1.5 bg-[#c19a6b] hover:bg-[#d9ab75] text-[#1c0f0a] text-xs font-bold rounded-lg transition-colors"
                >
                  読込
                </button>
                <button
                  onClick={(e) => handleDelete(song.id, e)}
                  className="p-2 hover:bg-red-950/60 rounded-lg transition-colors text-red-400 opacity-70 hover:opacity-100"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#3d251a] bg-[#170c08] text-center text-xs text-[#e5d3b3]/40">
          {songs.length}曲保存中 (ブラウザ内IndexedDBにのみ保管され、サーバーには送信されません)
        </div>
      </div>
    </div>
  );
}
