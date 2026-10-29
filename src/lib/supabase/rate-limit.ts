/**
 * Rate limiter simples em memória (chave → timestamp[]).
 *
 * Vale por instância do servidor: na Vercel cada instância conta à parte, então
 * é uma barreira contra rajada, não um limite global exato. Para limite global
 * seria preciso Redis/Upstash ou contagem no banco.
 */

interface RateLimitEntry {
  timestamps: number[];
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

const store = new Map<string, RateLimitEntry>();

/** Janela mais longa usada no app — o gc não pode apagar antes disso. */
const MAX_WINDOW_MS = 60 * 60 * 1000;
let gcCounter = 0;

function gc(): void {
  gcCounter++;
  if (gcCounter < 100) return;
  gcCounter = 0;
  const cutoff = Date.now() - MAX_WINDOW_MS;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/** true = passou do limite (e a tentativa NÃO é contada). */
export function isRateLimitedBy(key: string, opts: RateLimitOptions): boolean {
  gc();
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const scoped = `${opts.windowMs}:${opts.max}:${key}`;

  const entry = store.get(scoped);
  if (!entry) {
    store.set(scoped, { timestamps: [now] });
    return false;
  }

  const recent = entry.timestamps.filter((t) => t > cutoff);
  if (recent.length >= opts.max) {
    entry.timestamps = recent;
    return true;
  }

  recent.push(now);
  entry.timestamps = recent;
  return false;
}

/** Login: 5 tentativas por minuto. */
export function isRateLimited(key: string): boolean {
  return isRateLimitedBy(key, { max: 5, windowMs: 60 * 1000 });
}
