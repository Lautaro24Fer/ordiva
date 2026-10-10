/** SQLSTATE de PostgreSQL relevantes para el dominio. */
export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";

/**
 * Busca un SQLSTATE en un error de Prisma con driver adapter. La ubicación del
 * código varía según el tipo de error, así que se recorre la cadena de `cause`
 * y `meta.driverAdapterError` sin depender de una forma única.
 */
export function getPgErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    const record = current as Record<string, unknown>;
    for (const key of ["originalCode", "code"]) {
      const value = record[key];
      if (typeof value === "string" && /^[0-9A-Z]{5}$/.test(value) && !value.startsWith("P")) {
        return value;
      }
    }
    queue.push(record.cause, record.meta, record.driverAdapterError);
  }
  return undefined;
}

export function isExclusionViolation(error: unknown): boolean {
  return getPgErrorCode(error) === PG_EXCLUSION_VIOLATION;
}

export const PG_UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === PG_UNIQUE_VIOLATION;
}
