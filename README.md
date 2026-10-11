# Ordiva — turnos online para negocios

Aplicación de reservas multi-negocio (peluquerías, barberías, centros de estética): los clientes reservan
sin crear cuenta y cada dueño administra servicios, horarios, reglas y turnos desde su panel.
Next.js 16 (App Router), PostgreSQL 17 y Prisma 7.

**Demo en vivo:** _(link de Vercel tras el primer deploy)_

## Demo

La demo pública corre **sin base de datos**: los datos de ejemplo y todo lo que cambies se guardan en el
localStorage de tu navegador.

- Reservá un turno en cualquiera de los negocios de ejemplo, desde el inicio.
- En **Probar el panel** entrás en un clic como dueño (Ana, Barbería Centro, o Bruno, Estética Norte):
  vas a ver la reserva que hiciste, podés cancelarla o completarla, y editar servicios, horarios y reglas.
- **Reiniciar datos** (banner superior) vuelve a los datos de ejemplo.

Para usarlo de verdad (datos compartidos y persistentes), instalalo con Docker.

## Instalación con Docker

Requisitos: Docker con Compose v2.

```bash
git clone https://github.com/Lautaro24Fer/ordiva.git && cd ordiva
cp .env.example .env
# Editá .env: AUTH_SECRET (openssl rand -base64 33), y POSTGRES_PASSWORD si lo querés cambiar.
SEED=1 docker compose --profile full up -d --build
```

Abrí <http://localhost:3000>. Compose levanta tres servicios:

| Servicio | Qué hace |
|---|---|
| `postgres` | PostgreSQL 17 con volumen persistente (`booking-pgdata`), expuesto en `localhost:5433` |
| `migrate` | Aplica las migraciones (`prisma migrate deploy`) y, con `SEED=1`, carga los datos de ejemplo. Termina al finalizar |
| `app` | Next.js en modo standalone, usuario sin privilegios, en el puerto 3000 |

- `SEED=1` solo hace falta la primera vez (el seed es idempotente). Sin él, arrancás vacío y creás tu cuenta en `/register`.
- Para actualizar después de un `git pull`: `docker compose --profile full up -d --build` (las migraciones nuevas se aplican solas).
- Si lo publicás en un dominio, definí `AUTH_URL` (por ejemplo, `https://turnos.midominio.com`) y poné un proxy con HTTPS adelante.
- Para bajar todo: `docker compose --profile full down`. Para borrar también los datos, agregá `-v`.

## Desarrollo local

Requisitos: Node.js 24, npm y Docker (solo para PostgreSQL).

```bash
cp .env.example .env   # y reemplazar AUTH_SECRET: openssl rand -base64 33
npm install            # incluye `prisma generate`
npm run db:up          # solo PostgreSQL 17 en localhost:5433 (bases booking y booking_test)
npm run db:migrate     # aplica las migraciones versionadas
npm run db:seed        # datos ficticios (idempotente)
npm run dev
```

Cuentas del seed: `ana@example.com` y `bruno@example.com`, con la contraseña `demo-password-123`
(solo datos ficticios). Para probar el modo demo en local: `NEXT_PUBLIC_DEMO_MODE=1 npm run dev`.

## Variables de entorno

| Variable | Modo real | Demo | Descripción |
|---|---|---|---|
| `DATABASE_URL` | Sí | — | Conexión del runtime (en Neon, con pooler) |
| `DIRECT_URL` | Para migrar/sembrar | — | Conexión de la CLI de Prisma (sin pooler). `prisma generate` no la necesita |
| `DATABASE_URL_TEST` | Tests | — | Base exclusiva de los tests de integración (se trunca) |
| `AUTH_SECRET` | Sí | Sí | Firma y cifra la cookie de sesión: `openssl rand -base64 33` |
| `AUTH_URL` | Fuera de Vercel | — | URL pública (por ejemplo, `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | Detrás de un proxy | — | `true` para confiar en el header `Host` (ya viene en Compose) |
| `NEXT_PUBLIC_DEMO_MODE` | — | `1` | Activa la demo sin base de datos. **Se fija en el build** |
| `POSTGRES_PASSWORD`, `SEED` | Compose | — | Contraseña de PostgreSQL (por defecto `booking`) y seed en el primer arranque |

## Deploy de la demo en Vercel

1. Importá el repo en Vercel (framework: Next.js; comando de build por defecto).
2. Variables de entorno (Production y Preview): `NEXT_PUBLIC_DEMO_MODE=1` y `AUTH_SECRET` (un valor nuevo,
   generado con `openssl rand -base64 33`). **No** definas `DATABASE_URL` ni `DIRECT_URL`.
3. Deploy. El CI verifica en cada push que la demo compile sin base de datos (job `demo-build`).

Si más adelante sumás un cliente real, el mismo repo se despliega en modo real: quitá
`NEXT_PUBLIC_DEMO_MODE`, agregá `DATABASE_URL`/`DIRECT_URL` (por ejemplo, de Neon) y corré `npm run db:deploy`.

## Scripts

| Script | Descripción |
|---|---|
| `npm test` | Tests unitarios (sin BD), incluida la API demo sobre localStorage |
| `npm run test:integration` | Tests contra PostgreSQL real: recrea `booking_test` y ejecuta `prisma migrate deploy` |
| `npm run lint` / `npm run typecheck` / `npm run build` | Calidad y build |
| `npm run db:up` / `npm run db:down` | Levanta o baja solo PostgreSQL (desarrollo) |
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

## Login y panel del dueño

| Ruta | Contenido |
|---|---|
| `/register`, `/login` | Alta y acceso de dueños (email + contraseña) |
| `/dashboard` | Negocios del usuario; alta en `/dashboard/new` |
| `/dashboard/[businessId]` | Turnos del día (navegación por fecha, completar/cancelar) |
| `/dashboard/[businessId]/services` | Alta, edición y activación de servicios |
| `/dashboard/[businessId]/hours` | Franjas semanales (varias por día) |
| `/dashboard/[businessId]/settings` | Datos del negocio y reglas de reserva |

**Cómo funciona la autenticación**

- Auth.js v5 (`next-auth@5.0.0-beta.32`, todavía en beta) con el provider Credentials y sesión **JWT**
  en una cookie httpOnly, `SameSite=Lax` y `Secure` en HTTPS, firmada con `AUTH_SECRET`. Dura 8 horas.
  No usa tablas de sesión ni el adapter de Prisma.
- Las contraseñas se guardan con Argon2id. El login responde igual si el email no existe o si la contraseña es
  incorrecta, y en ambos casos verifica un hash señuelo para que el tiempo de respuesta no revele qué cuentas existen.
- `proxy.ts` solo redirige a `/login` si no hay sesión. La autorización real está en cada página
  (`lib/dashboard.ts`) y en cada endpoint (`lib/session.ts` + `requireOwnedBusiness`).
- Un negocio ajeno responde 404.
- Las lecturas del panel son Server Components que llaman a `modules/*` (en la demo, componentes de cliente que
  leen de localStorage; ver [Modo demo](#cómo-funciona-el-modo-demo)). Las escrituras usan la API REST de
  administración, ya cubierta por tests, con la cookie de sesión. Las mutaciones (POST/PUT/PATCH/DELETE)
  quedan protegidas de CSRF por la cookie `SameSite=Lax` y el `Content-Type: application/json`.
- Login y registro son Server Actions. Next valida su origen, y `callbackUrl` solo acepta rutas internas
  (`lib/safe-redirect.ts`).
- El registro es simple y **sin verificación de email**: sirve para la demo, no para producción.

## Páginas públicas

| Ruta | Contenido |
|---|---|
| `/` | Directorio de negocios de demostración |
| `/b/[slug]` | Datos del negocio y servicios activos |
| `/b/[slug]/booking?serviceId=1` | Flujo de reserva: servicio → día → horario → datos → confirmación |

Con `cacheComponents`, el esqueleto de carga se sirve como HTML estático y los datos llegan en streaming
dentro de `<Suspense>` en cada request (sin caché: los cambios del dueño se ven al instante). Un slug inexistente
muestra "Negocio no encontrado" con `noindex`, pero el status HTTP es 200 porque el streaming ya empezó.

UI con shadcn/ui (estilo `base-nova`, Base UI) y React Hook Form. El formulario reutiliza los schemas Zod
del servidor (`schemas/appointments.ts`), que solo dependen de `lib/formats.ts` y no arrastran código de servidor.

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

### Administración (requiere sesión; sin ella responde 401)

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
- Capas: Route Handler (Zod + sesión) → `modules/*` (dominio + ownership) → repositorio
  (`modules/repositories.ts`). Los servicios no conocen Prisma: reciben los repositorios como primer
  argumento, así la misma lógica corre contra PostgreSQL (`lib/repositories/prisma.ts`) o contra
  localStorage en la demo (`lib/demo/local-repos.ts`).

## Cómo funciona el modo demo

Con `NEXT_PUBLIC_DEMO_MODE=1` (se fija en el build):

- **Datos**: un snapshot en el localStorage de cada visitante (`ordiva-demo:v1`), sembrado desde
  `lib/demo/seed-data.ts` (la misma fuente que `prisma/seed.ts`) con turnos relativos a hoy. Se vuelve a
  sembrar si tiene más de 7 días, si está corrupto o con el botón "Reiniciar datos" del banner.
- **API**: `apiRequest` (`lib/api-client.ts`) no llama al servidor. Despacha a `lib/demo/api-router.ts`,
  que repite la secuencia de los Route Handlers (mismos schemas Zod, mismos servicios, misma forma de
  respuesta y de error) contra `lib/demo/local-repos.ts`. Ese repositorio emula las restricciones de
  PostgreSQL: no solapamiento de turnos, slug y email únicos.
- **Páginas**: las que leen datos derivan a variantes de cliente (`components/demo/demo-pages.tsx`) que
  usan los mismos servicios y componentes de vista, y se actualizan solas cuando cambia el store.
- **Auth**: Auth.js sigue igual (cookie JWT, `proxy.ts`). En la demo solo valida las cuentas sembradas
  (`lib/demo/auth.ts`), y `/login` ofrece "Entrar como Ana/Bruno". El registro está desactivado.
- **Servidor**: no necesita base de datos. Los Route Handlers de `/api/*` (salvo `/api/auth`) responden 404.

## Limitaciones conocidas

- **Demo**: los datos viven en el navegador. No se comparten entre visitantes ni dispositivos, y las
  reservas de la página pública no le llegan a nadie.

- **Rate limiting en memoria** (`lib/rate-limit.ts`) para reservas, login y registro: no es global en serverless.
  Antes de operar con usuarios reales hay que reemplazarlo por un store compartido.
- Registro sin verificación de email ni recuperación de contraseña.
- Antispam básico (campo honeypot `website`); no hay CAPTCHA.
- Sin feriados ni cierres especiales, sin moneda configurable (se asume ARS) y sin horarios nocturnos.
