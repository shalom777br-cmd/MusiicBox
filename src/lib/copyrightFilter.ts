// 著作権保護期間の簡易チェック
// JASRAC管理楽曲の完全なリストは公開APIが必要だが、
// まずは主要な保護楽曲のブラックリスト + PD判定で対応

// パブリックドメイン（著作権切れ）の作曲家リスト
// 生誕年 + 70年経過でPD（日本の著作権法）
// 1870年以前生まれの作曲家は原則PD（2026年時点）
const PD_COMPOSERS = [
  // クラシック作曲家（全員PD）
  'bach', 'mozart', 'beethoven', 'chopin', 'schubert', 'schumann',
  'brahms', 'debussy', 'tchaikovsky', 'vivaldi', 'handel', 'haydn',
  'mendelssohn', 'liszt', 'grieg', 'dvorak', 'ravel', 'satie',
  'pachelbel', 'purcell', 'monteverdi', 'rameau', 'couperin',
  'scarlatti', 'corelli', 'boccherini', 'bizet', 'rossini',
  'verdi', 'wagner', 'mahler', 'stravinsky', 'rachmaninov',
  'johann strauss', 'j.s. bach', 'w.a. mozart',
];

// 著作権保護中の楽曲の簡易ブラックリスト（曲名の一部一致）
// 正確な判定はJASRAC等のAPIが必要だが、まずは主要な保護楽曲で対応
const COPYRIGHTED_FRAGMENTS = [
  // ディズニー
  'let it go', 'frozen', 'a whole new world', 'part of your world',
  'under the sea', 'beauty and the beast', 'tale as old as time',
  // スタジオジブリ
  'となりのトトロ', 'さんぽ', '風の谷のナウシカ', '君をのせて',
  'いつも何度でも', '千と千尋の神隠し', '人生のメリーゴーランド',
  'テルーの唄', '時の歌', 'さよならの夏', 'コクリコ坂から',
  '海になれる', '風になる', 'レット・イット・ゴー',
  // ポップス・J-POP（一部）
  'birthday song', 'プレゼント', 'ハッピーバースデー', 'happy birthday',
];

export interface CopyrightCheckResult {
  isCopyrighted: boolean;
  isPublicDomain: boolean;
  warningLevel: 'ok' | 'caution' | 'warning';
  message: string;
  detectedTitle?: string;
  detectedComposer?: string;
}

export function checkCopyright(title: string, composer: string): CopyrightCheckResult {
  const titleLower = (title || '').toLowerCase().trim();
  const composerLower = (composer || '').toLowerCase().trim();
  
  // 1. 作曲家がPDリストに含まれている場合 → PD確定
  for (const pdComposer of PD_COMPOSERS) {
    if (composerLower.includes(pdComposer)) {
      return {
        isCopyrighted: false,
        isPublicDomain: true,
        warningLevel: 'ok',
        message: `${composer}は著作権切れ（パブリックドメイン）の作曲家です。自由に編曲・エクスポートできます。`,
        detectedComposer: composer,
      };
    }
  }
  
  // 2. 曲名が著作権保護リストに含まれている場合 → 警告
  for (const fragment of COPYRIGHTED_FRAGMENTS) {
    if (titleLower.includes(fragment)) {
      return {
        isCopyrighted: true,
        isPublicDomain: false,
        warningLevel: 'warning',
        message: `「${title}」は著作権保護期間中の可能性が高い楽曲です。個人利用の範囲内でのみご使用ください。エクスポート機能が制限されます。`,
        detectedTitle: title,
      };
    }
  }
  
  // 3. 作曲家が不明・現代作曲家の場合 → 注意
  if (composerLower && !PD_COMPOSERS.some(c => composerLower.includes(c))) {
    return {
      isCopyrighted: false,
      isPublicDomain: false,
      warningLevel: 'caution',
      message: `作曲家「${composer}」の著作権状況が確認できません。個人利用の範囲内でご使用ください。`,
      detectedComposer: composer,
    };
  }
  
  // 4. タイトル・作曲家ともに不明
  return {
    isCopyrighted: false,
    isPublicDomain: false,
    warningLevel: 'ok',
    message: '著作権情報を確認できませんでした。個人利用の範囲内でご使用ください。',
  };
}
