/**
 * Errores de dominio con código estable y status HTTP. Los mensajes son aptos
 * para el cliente; nunca incluir SQL, trazas ni datos personales.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "Autenticación requerida") =>
  new AppError(401, "UNAUTHORIZED", message);

export const notFound = (message = "Recurso no encontrado") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (code: string, message: string) => new AppError(409, code, message);

export const unprocessable = (code: string, message: string) => new AppError(422, code, message);

export const tooManyRequests = (message = "Demasiadas solicitudes, intentá más tarde") =>
  new AppError(429, "RATE_LIMITED", message);
