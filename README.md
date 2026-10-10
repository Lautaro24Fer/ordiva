# Plataforma de turnos multi-negocio (MVP)

Aplicación de reservas para varios negocios (peluquerías, barberías, estética) con
Next.js 16 (App Router), PostgreSQL y Prisma 7. Estado: Fase 2 (API y dominio) completa; falta interfaz y login.

## Requisitos

- Node.js 24 y npm
- Docker (solo para PostgreSQL)

## Puesta en marcha local

```bash
cp .env.example .env
npm install            # incluye `prisma generate`
npm run db:up          # PostgreSQL 17 en localhost:5433 (bases booking y booking_test)
npm run db:migrate     # aplica las migraciones versionadas
npm run db:seed        # datos ficticios (idempotente)
npm run dev
```

Cuentas demo del seed: `ana@example.com` y `bruno@example.com`, con la contraseña
`demo-password-123` (solo datos ficticios).

## Scripts

| Script | Descripción |
|---|---|
| `npm test` | Tests unitarios (sin BD) |
| `npm run test:integration` | Tests contra PostgreSQL real: recrea `booking_test` y ejecuta `prisma migrate deploy` |
| `npm run lint` / `npm run typecheck` / `npm run build` | Calidad y build |
| `npm run db:deploy` | `prisma migrate deploy` (despliegues; nunca `db push`) |

## Integridad de datos

La migración `init` agrega SQL que Prisma no puede expresar:

- `appointment_no_overlap`: `EXCLUDE USING gist` por negocio sobre `tstzrange(startAt, endAt, '[)')`
  para estados `CONFIRMED`/`COMPLETED` (requiere `btree_gist`). Ante una colisión PostgreSQL lanza
  `23P01`. Con Prisma 7 + `@prisma/adapter-pg` llega como `P2039` con el SQLSTATE en
  `meta.driverAdapterError.cause.originalCode` (ver `lib/db-errors.ts`).
- `CHECK` de intervalos, duración/precio, día 0–6 (0 = domingo), formato `HH:mm`, reglas de reserva,
  formato de slug y email normalizado.
- El no solapamiento entre franjas de `BusinessHours` **no** está garantizado por la BD. Lo valida Zod,
  y el reemplazo se hace en una transacción con `SELECT … FOR UPDATE` sobre el negocio.

## API

Todas las respuestas son JSON. Las fechas van en ISO-8601 UTC y los importes como string decimal (`"12000.00"`).
Los errores usan el formato `{ "error": { "code", "message", "details?" } }`.

### Pública

| Método | Ruta | Notas |
|---|---|---|
| GET | `/api/businesses/[slug]` | Datos públicos del negocio |
| GET | `/api/businesses/[slug]/services` | Solo servicios activos |
| GET | `/api/businesses/[slug]/availability?serviceId=1&date=YYYY-MM-DD` | Slots `{ startAt, endAt, label }`; fecha local del negocio |
| POST | `/api/businesses/[slug]/appointments` | `{ serviceId, startAt, customerName, customerContact }` → 201; 409 si el horario se ocupó |

### Administración (requiere sesión; hasta la Fase 4 responde siempre 401)

Rutas anidadas por negocio. Cada operación verifica que el negocio pertenezca al usuario
de la sesión; si no, responde 404 igual que para un recurso inexistente.

| Método | Ruta |
|---|---|
| GET, POST | `/api/admin/businesses` |
| GET, PATCH | `/api/admin/businesses/[businessId]` |
| GET, POST | `/api/admin/businesses/[businessId]/services` |
| PATCH, DELETE | `/api/admin/businesses/[businessId]/services/[serviceId]` (DELETE = desactivar) |
| GET, PUT | `/api/admin/businesses/[businessId]/hours` (reemplazo atómico) |
| GET, PUT | `/api/admin/businesses/[businessId]/booking-rule` |
| GET | `/api/admin/businesses/[businessId]/appointments?date=YYYY-MM-DD` |
| PATCH | `/api/admin/businesses/[businessId]/appointments/[appointmentId]` (`CANCELLED` / `COMPLETED`) |

### Códigos

`400` entrada mal formada (Zod) · `401` sin sesión · `404` no existe o no te pertenece ·
`409` horario ocupado, slug repetido o transición inválida · `422` regla de negocio (aviso mínimo, horizonte, fuera de grilla) ·
`429` límite de intentos.

## Decisiones

- Estructura en la raíz (`app/`, `lib/`, `modules/`, `generated/prisma`), sin `src/`.
- Zonas horarias con Luxon. Política DST: una hora local inexistente se rechaza y una ambigua
  toma la primera ocurrencia.
- Contraseñas con Argon2id (`@node-rs/argon2`).
- `customerContact`: email (normalizado a minúsculas) o teléfono E.164 (`+5491123456789`). Solo se quitan
  espacios y guiones; nunca se adivina el prefijo de país.
- Grilla de slots: cada `slotIntervalMinutes` en tiempo absoluto desde la apertura de cada franja. El turno
  completo debe terminar antes del cierre de esa franja. El horizonte va de hoy a hoy + `maxAdvanceDays − 1`
  en la zona del negocio.
- El servidor calcula `endAt`, precio y duración (snapshot). El cliente no puede elegirlos.
- Capas: Route Handler (Zod + sesión) → `modules/*` (dominio + ownership) → Prisma. Los módulos importan
  `server-only`.

## Limitaciones conocidas

- **Rate limiting en memoria** (`lib/rate-limit.ts`): no es global en serverless. Antes de operar con usuarios
  reales hay que reemplazarlo por un store compartido.
- Antispam básico (campo honeypot `website`); no hay CAPTCHA.
- Sin feriados ni cierres especiales, sin moneda configurable (se asume ARS) y sin horarios nocturnos.
