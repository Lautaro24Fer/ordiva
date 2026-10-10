/**
 * Rate limiting con ventana fija.
 *
 * ADVERTENCIA: la implementación en memoria solo sirve para desarrollo y demo.
 * En serverless cada instancia tiene su propia memoria, así que el límite no
 * es global. Antes de operar con usuarios reales, reemplazarla por un store
 * compartido que implemente `RateLimiter` (punto abierto #5).
 */
export interface RateLimiter {
  /** Registra un intento; devuelve false si se superó el límite. */
  consume(key: string): Promise<boolean>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async consume(key: string): Promise<boolean> {
    const now = Date.now();
    const current = this.windows.get(key);

    if (!current || current.resetAt <= now) {
      this.pruneExpired(now);
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    current.count += 1;
    return current.count <= this.limit;
  }

  reset(): void {
    this.windows.clear();
  }

  private pruneExpired(now: number): void {
    if (this.windows.size < 10_000) return;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}

/** Reservas públicas: 10 intentos cada 10 minutos por IP y negocio. */
export const publicBookingRateLimiter = new InMemoryRateLimiter(10, 10 * 60_000);
