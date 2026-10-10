# Plataforma de turnos multi-negocio (MVP)

Aplicación de reservas para varios negocios (peluquerías, barberías, estética) con
Next.js 16 (App Router), PostgreSQL y Prisma 7. En desarrollo: Fase 1 (persistencia).

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
- El no solapamiento entre franjas de `BusinessHours` **no** está garantizado por la BD; se validará
  en la capa de servicio.

## Decisiones

- Estructura en la raíz (`app/`, `lib/`, `modules/`, `generated/prisma`), sin `src/`.
- Zonas horarias con Luxon. Política DST: una hora local inexistente se rechaza y una ambigua
  toma la primera ocurrencia.
- Contraseñas con Argon2id (`@node-rs/argon2`).
