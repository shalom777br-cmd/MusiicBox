// ブラウザのIndexedDBでオルゴール楽曲を自動保存・履歴管理
// ステートレス設計を維持しつつ「マイ書庫」機能を実現

const DB_NAME = 'musiicbox-library';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

export interface SavedSong {
  id: string;
  title: string;
  composer: string;
  notes: any[];
  settings: any;
  meta: any;
  copyrightStatus?: string;
  savedAt: string;
  updatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
  });
}

// 楽曲を保存（新規・更新）
export async function saveSong(song: Omit<SavedSong, 'id' | 'savedAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  const db = await openDB();
  const now = new Date().toISOString();
  const id = song.id || `song_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const existing = song.id ? await getSongById(song.id) : null;
  const record: SavedSong = {
    ...song,
    id,
    savedAt: existing?.savedAt || now,
    updatedAt: now,
  };
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// 全楽曲取得（履歴一覧）
export async function getAllSongs(): Promise<SavedSong[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result as SavedSong[]) || [];
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

// IDで単曲取得
export async function getSongById(id: string): Promise<SavedSong | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// 楽曲削除
export async function deleteSong(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 検索（タイトル・作曲家名）
export async function searchSongs(query: string): Promise<SavedSong[]> {
  const all = await getAllSongs();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(song =>
    song.title?.toLowerCase().includes(q) ||
    song.composer?.toLowerCase().includes(q)
  );
}

// 楽曲数取得
export async function getSongCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
