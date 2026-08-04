// Upstash Redisを使用したサーバーレス向けレートリミット
// Upstash無料枠: 10,000コマンド/日 — MusiicBoxには十分

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 環境変数からUpstash認証情報を取得
const redisUrl = process.env.UPSTASH_REDIS_URL || '';
const redisToken = process.env.UPSTASH_REDIS_TOKEN || '';

const redis = (redisUrl && redisToken) ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

// 2種類のレートリミット
// 1. 楽譜解析API（重い処理）: 1分間に5回まで
const parseLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'musiicbox:parse',
  analytics: true,
}) : null;

// 2. ハミング解析API（重い処理）: 1分間に5回まで
const hummingLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'musiicbox:humming',
  analytics: true,
}) : null;

// 3. 一般API: 1分間に30回まで
const generalLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'musiicbox:general',
  analytics: true,
}) : null;

export function getRateLimiter(endpoint: 'parse' | 'humming' | 'general') {
  switch (endpoint) {
    case 'parse': return parseLimit;
    case 'humming': return hummingLimit;
    default: return generalLimit;
  }
}

// Express ミドルウェア
export function rateLimitMiddleware(endpoint: 'parse' | 'humming' | 'general' = 'general') {
  return async (req: any, res: any, next: any) => {
    // Upstash未設定の場合はフォールバック（メモリベース）
    if (!process.env.UPSTASH_REDIS_URL || !redis) {
      return memoryRateLimit(req, res, next, endpoint === 'parse' || endpoint === 'humming' ? 5 : 30);
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.headers['x-real-ip'] as string || 
               req.socket.remoteAddress || 
               'unknown';
    
    const limiter = getRateLimiter(endpoint);
    if (!limiter) {
      return memoryRateLimit(req, res, next, endpoint === 'parse' || endpoint === 'humming' ? 5 : 30);
    }
    
    try {
      const { success, limit, remaining, reset } = await limiter.limit(ip);
      
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', reset.toString());
      
      if (!success) {
        return res.status(429).json({
          success: false,
          error: 'リクエスト数が多すぎます。1分ほど待ってから再度お試しください。',
          retry_after: Math.ceil((reset - Date.now()) / 1000),
        });
      }
      
      next();
    } catch (err) {
      console.error('Rate limit check failed, allowing request:', err);
      next(); // エラー時は許可（フェイルオープン）
    }
  };
}

// Upstash未設定時のフォールバック（メモリベース・簡易版）
const memoryStore = new Map<string, { count: number; resetTime: number }>();

function memoryRateLimit(req: any, res: any, next: any, maxRequests: number) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             req.socket.remoteAddress || 
             'unknown';
  const now = Date.now();
  const windowMs = 60000;
  
  let record = memoryStore.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    memoryStore.set(ip, record);
    next();
    return;
  }
  
  record.count++;
  const remaining = Math.max(0, maxRequests - record.count);
  const reset = Math.ceil((record.resetTime - now) / 1000);
  
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', reset.toString());
  
  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'リクエスト数が多すぎます。1分ほど待ってから再度お試しください。',
      retry_after: reset,
    });
  }
  
  next();
}
