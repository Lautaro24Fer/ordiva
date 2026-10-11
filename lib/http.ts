import { ZodError, type ZodType, type z } from "zod";
import { AppError, badRequest } from "@/lib/errors";

type ErrorBody = { error: { code: string; message: string; details?: unknown } };

function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: { code, message, ...(details !== undefined && { details }) } };
}

export function jsonError(status: number, code: string, message: string, details?: unknown): Response {
  return Response.json(errorBody(code, message, details), { status });
}

/** Detalles de validación sin eco de los valores recibidos (pueden contener PII). */
function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/**
 * Envuelve un Route Handler: traduce AppError/ZodError a respuestas JSON y
 * oculta cualquier otro error detrás de un 500 genérico. El log omite mensaje
 * y detalles del error (pueden incluir filas con PII o URLs de BD).
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      return Response.json(body, { status });
    }
  };
}

/** Traducción de errores compartida con la API simulada del modo demo. */
export function toErrorResponse(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof AppError) {
    return { status: error.status, body: errorBody(error.code, error.message, error.details) };
  }
  if (error instanceof ZodError) {
    return { status: 400, body: errorBody("VALIDATION_ERROR", "Datos inválidos", zodDetails(error)) };
  }
  const name = error instanceof Error ? error.name : typeof error;
  const code = (error as { code?: unknown } | null)?.code;
  console.error("Error no controlado", { name, code });
  return { status: 500, body: errorBody("INTERNAL_ERROR", "Error interno del servidor") };
}

/** Lee y valida el cuerpo JSON. */
export async function parseJsonBody<S extends ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("El cuerpo debe ser JSON válido");
  }
  return schema.parse(body);
}

/** Valida los query params (valores string) contra un schema. */
export function parseSearchParams<S extends ZodType>(request: Request, schema: S): z.output<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return schema.parse(params);
}

/** IP del cliente según headers del proxy (Vercel los sobrescribe; en otros hosts pueden falsificarse). */
export function getClientIp(source: Request | Headers): string {
  const headers = source instanceof Headers ? source : source.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
