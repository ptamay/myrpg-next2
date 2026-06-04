/**
 * Rate limiter simples em memória.
 * Suficiente para prevenir abusos básicos e bots.
 * Nota: reinicia caso o servidor "durma" (cold start serverless).
 * Para ambientes de alta escala, troque o Map por Redis (Upstash).
 */

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;     // Janela de 1 minuto
const MAX_REQUESTS = 10;       // Máximo de 10 tentativas por janela

export function rateLimitCheck(ip: string, route: string): { allowed: boolean; retryAfterMs: number } {
  const key = `${route}::${ip}`;
  const now = Date.now();

  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetAt) {
    // Nova janela
    requestCounts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Extrai o IP da requisição de forma segura (funciona em Next.js App Router). */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}
