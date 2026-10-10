-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHours" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "customerName" VARCHAR(150) NOT NULL,
    "customerContact" VARCHAR(255) NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "serviceDurationMinutes" INTEGER NOT NULL,
    "servicePrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRule" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "minNoticeMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- CreateIndex
CREATE INDEX "Service_businessId_isActive_idx" ON "Service"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Service_id_businessId_key" ON "Service"("id", "businessId");

-- CreateIndex
CREATE INDEX "BusinessHours_businessId_dayOfWeek_idx" ON "BusinessHours"("businessId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHours_businessId_dayOfWeek_startTime_key" ON "BusinessHours"("businessId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_businessId_startAt_idx" ON "Appointment"("businessId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_businessId_status_startAt_idx" ON "Appointment"("businessId", "status", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_businessId_idx" ON "Appointment"("serviceId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRule_businessId_key" ON "BookingRule"("businessId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_businessId_fkey" FOREIGN KEY ("serviceId", "businessId") REFERENCES "Service"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRule" ADD CONSTRAINT "BookingRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Constraints que Prisma schema no puede expresar (agregados manualmente).
-- ---------------------------------------------------------------------------

-- Necesario para combinar "=" sobre INTEGER con "&&" sobre rangos en un índice GiST.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Appointment: intervalo positivo y ninguna reserva activa solapada por negocio.
-- Intervalos semiabiertos [start, end): turnos adyacentes son compatibles.
-- Una colisión lanza SQLSTATE 23P01 (exclusion_violation) → la API responde 409.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_positive_interval" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "appointment_snapshot_valid"
    CHECK ("serviceDurationMinutes" > 0 AND "servicePrice" >= 0),
  ADD CONSTRAINT "appointment_no_overlap"
    EXCLUDE USING gist (
      "businessId" WITH =,
      tstzrange("startAt", "endAt", '[)') WITH &&
    )
    WHERE ("status" IN ('CONFIRMED'::"AppointmentStatus", 'COMPLETED'::"AppointmentStatus"));

-- Service: duración positiva y precio no negativo.
ALTER TABLE "Service"
  ADD CONSTRAINT "service_duration_positive" CHECK ("durationMinutes" > 0),
  ADD CONSTRAINT "service_price_non_negative" CHECK ("price" >= 0);

-- BusinessHours: día 0 (domingo)..6 (sábado), formato HH:mm 24h y apertura < cierre.
-- Con HH:mm de ancho fijo la comparación lexicográfica equivale a la temporal.
-- El NO solapamiento entre franjas se valida en la capa de servicio (no en BD).
ALTER TABLE "BusinessHours"
  ADD CONSTRAINT "business_hours_day_range" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "business_hours_start_format" CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "business_hours_end_format" CHECK ("endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "business_hours_start_before_end" CHECK ("startTime" < "endTime");

-- BookingRule: valores en rango válido.
ALTER TABLE "BookingRule"
  ADD CONSTRAINT "booking_rule_slot_interval_positive" CHECK ("slotIntervalMinutes" > 0),
  ADD CONSTRAINT "booking_rule_min_notice_non_negative" CHECK ("minNoticeMinutes" >= 0),
  ADD CONSTRAINT "booking_rule_max_advance_positive" CHECK ("maxAdvanceDays" > 0);

-- Business: slug en minúsculas ASCII, dígitos y guiones simples; 3..150 caracteres.
ALTER TABLE "Business"
  ADD CONSTRAINT "business_slug_format"
    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("slug") >= 3);

-- User: email normalizado (trim + lowercase) para que la unicidad sea efectiva.
ALTER TABLE "User"
  ADD CONSTRAINT "user_email_normalized" CHECK ("email" = lower(btrim("email")));
