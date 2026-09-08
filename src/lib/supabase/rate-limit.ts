/**
 * Rate limiter simples em memória (IP → timestamp[]).
 *
 * Adequado para servidor único em desenvolvimento/staging.
 * Em produção com múltiplas instâncias: usar Redis ou Supabase Edge Function
 * com Rate Limiting API.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/** Limpa entradas com mais de `windowMs` de idade a cada 100 chamadas. */
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_ATTEMPTS = 5;
let gcCounter = 0;

function gc(): void {
  const cutoff = Date.now() - WINDOW_MS;
  gcCounter++;
  if (gcCounter < 100) return;
  gcCounter = 0;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export function isRateLimited(key: string): boolean {
  gc();
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const entry = store.get(key);
  if (!entry) {
    store.set(key, { timestamps: [now] });
    return false;
  }

  const recent = entry.timestamps.filter((t) => t > cutoff);
  if (recent.length >= MAX_ATTEMPTS) {
    return true;
  }

  recent.push(now);
  entry.timestamps = recent;
  return false;
}
