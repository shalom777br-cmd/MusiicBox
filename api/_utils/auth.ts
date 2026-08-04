import crypto from 'crypto';

// Cloudflare Turnstileトークン検証
// ボット排除・人間であることの確認
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // 未設定時はスキップ（開発環境向け）
    console.warn('TURNSTILE_SECRET_KEY not set, skipping verification');
    return true;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification failed:', err);
    return false;
  }
}

// Turnstile検証ミドルウェア（API呼び出し時に使用）
export async function turnstileMiddleware(req: any, res: any, next: any) {
  const turnstileToken = req.headers['x-turnstile-token'];
  
  // Turnstile未設定時はスキップ
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return next();
  }
  
  if (!turnstileToken) {
    return res.status(403).json({
      success: false,
      error: 'ボット確認が必要です。ページを再読み込みしてください。',
    });
  }
  
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  const isValid = await verifyTurnstile(turnstileToken as string, ip);
  
  if (!isValid) {
    return res.status(403).json({
      success: false,
      error: 'ボット確認に失敗しました。',
    });
  }
  
  next();
}

// 簡易セッショントークン（認証というより、ユーザー識別用）
// 重いAPI（楽譜解析・ハミング）の呼び出し時に、セッションを要求
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifySessionToken(req: any, res: any, next: any) {
  // クッキーまたはヘッダーからセッショントークンを取得
  const token = req.headers['x-session-token'] || 
                req.cookies?.session_token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'セッションが無効です。ページを再読み込みしてください。',
    });
  }
  
  // トークン形式の簡易検証（32バイトhex = 64文字）
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
    return res.status(401).json({
      success: false,
      error: '無効なセッショントークンです。',
    });
  }
  
  req.sessionToken = token;
  next();
}
