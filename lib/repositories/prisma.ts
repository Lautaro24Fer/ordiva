import "server-only";
import { cache } from "react";
import type { PrismaClient } from "@/generated/prisma/client";
import { isExclusionViolation, isUniqueViolation } from "@/lib/db-errors";
import {
  ConstraintViolation,
  type AdminAppointmentRow,
  type Repositories,
} from "@/modules/repositories";

/**
 * Repositorios sobre PostgreSQL. Las garantías fuertes (EXCLUDE para turnos,
 * UNIQUE para slug/email, lock en el reemplazo de franjas) viven en la base;
 * acá solo se traducen sus errores a `ConstraintViolation`.
 */

type Decimalish = { toFixed(decimals: number): string };

const money = (value: Decimalish) => value.toFixed(2);

const publicBusinessSelect = { name: true, slug: true, description: true, timezone: true } as const;
const ownedBusinessSelect = { id: true, ...publicBusinessSelect, createdAt: true } as const;
const bookingRuleSelect = { slotIntervalMinutes: true, minNoticeMinutes: true, maxAdvanceDays: true } as const;
const hoursSelect = { dayOfWeek: true, startTime: true, endTime: true } as const;
const hoursOrder = [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }];

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  price: true,
  isActive: true,
} as const;

const adminAppointmentSelect = {
  id: true,
  customerName: true,
  customerContact: true,
  startAt: true,
  endAt: true,
  status: true,
  serviceDurationMinutes: true,
  servicePrice: true,
  service: { select: { id: true, name: true } },
} as const;

function toService<T extends { price: Decimalish }>(row: T): Omit<T, "price"> & { price: string } {
  return { ...row, price: money(row.price) };
}

function toAdminAppointment<T extends { servicePrice: Decimalish }>(row: T) {
  return { ...row, servicePrice: money(row.servicePrice) } as unknown as AdminAppointmentRow;
}

async function rethrowConstraint<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConstraintViolation("unique");
    if (isExclusionViolation(error)) throw new ConstraintViolation("overlap");
    throw error;
  }
}

export function createPrismaRepositories(prisma: PrismaClient): Repositories {
  // `cache` deduplica la lectura dentro de un mismo request (metadata + página).
  const findPublicPage = cache((slug: string) =>
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        ...publicBusinessSelect,
        bookingRule: { select: bookingRuleSelect },
        services: {
          where: { isActive: true },
          select: { id: true, name: true, description: true, durationMinutes: true, price: true },
          orderBy: { name: "asc" },
        },
      },
    }),
  );

  return {
    businesses: {
      findBySlug: (slug) =>
        prisma.business.findUnique({ where: { slug }, select: { id: true, ...publicBusinessSelect } }),

      async findPublicPage(slug) {
        const business = await findPublicPage(slug);
        return business && { ...business, services: business.services.map(toService) };
      },

      listWithActiveServices: (limit) =>
        prisma.business.findMany({
          where: { services: { some: { isActive: true } } },
          select: { name: true, slug: true, description: true },
          orderBy: { name: "asc" },
          take: limit,
        }),

      findOwned: (userId, businessId) =>
        prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: ownedBusinessSelect }),

      listOwned: (userId) =>
        prisma.business.findMany({ where: { ownerId: userId }, select: ownedBusinessSelect, orderBy: { id: "asc" } }),

      create: (userId, data, rule) =>
        rethrowConstraint(
          prisma.business.create({
            data: { ...data, ownerId: userId, bookingRule: { create: rule } },
            select: ownedBusinessSelect,
          }),
        ),

      async update(userId, businessId, data) {
        const { count } = await prisma.business.updateMany({ where: { id: businessId, ownerId: userId }, data });
        return count > 0;
      },
    },

    bookingRules: {
      find: (businessId) => prisma.bookingRule.findUnique({ where: { businessId }, select: bookingRuleSelect }),
      upsert: (businessId, data) =>
        prisma.bookingRule.upsert({
          where: { businessId },
          update: data,
          create: { ...data, businessId },
          select: bookingRuleSelect,
        }),
    },

    hours: {
      list: (businessId, dayOfWeek) =>
        prisma.businessHours.findMany({
          where: { businessId, ...(dayOfWeek !== undefined && { dayOfWeek }) },
          select: hoursSelect,
          orderBy: hoursOrder,
        }),

      async openDays(businessId) {
        const rows = await prisma.businessHours.findMany({
          where: { businessId },
          select: { dayOfWeek: true },
          distinct: ["dayOfWeek"],
        });
        return rows.map((r) => r.dayOfWeek);
      },

      // El lock sobre la fila del negocio serializa ediciones concurrentes
      // para que dos reemplazos no se mezclen.
      replace: (userId, businessId, hours) =>
        prisma.$transaction(async (tx) => {
          const locked = await tx.$queryRaw<{ id: number }[]>`
            SELECT "id" FROM "Business" WHERE "id" = ${businessId} AND "ownerId" = ${userId} FOR UPDATE`;
          if (locked.length === 0) return null;

          await tx.businessHours.deleteMany({ where: { businessId } });
          await tx.businessHours.createMany({ data: hours.map((h) => ({ ...h, businessId })) });
          return tx.businessHours.findMany({ where: { businessId }, select: hoursSelect, orderBy: hoursOrder });
        }),
    },

    services: {
      async list(businessId, { activeOnly }) {
        const rows = await prisma.service.findMany({
          where: { businessId, ...(activeOnly && { isActive: true }) },
          select: serviceSelect,
          orderBy: activeOnly ? { name: "asc" } : [{ isActive: "desc" }, { name: "asc" }],
        });
        return rows.map(toService);
      },

      async findActive(businessId, serviceId) {
        const row = await prisma.service.findFirst({
          where: { id: serviceId, businessId, isActive: true },
          select: serviceSelect,
        });
        return row && toService(row);
      },

      async create(businessId, data) {
        return toService(await prisma.service.create({ data: { ...data, businessId }, select: serviceSelect }));
      },

      async update(userId, businessId, serviceId, data) {
        const where = { id: serviceId, businessId, business: { ownerId: userId } };
        const { count } = await prisma.service.updateMany({ where, data });
        if (count === 0) return null;
        return toService(await prisma.service.findFirstOrThrow({ where, select: serviceSelect }));
      },
    },

    appointments: {
      findOverlapping: (businessId, from, to, statuses) =>
        prisma.appointment.findMany({
          where: { businessId, status: { in: [...statuses] }, startAt: { lt: to }, endAt: { gt: from } },
          select: { startAt: true, endAt: true },
        }),

      create: (data) =>
        rethrowConstraint(
          prisma.appointment.create({
            data: { ...data, status: "CONFIRMED" },
            select: { id: true, startAt: true, endAt: true, status: true },
          }),
        ),

      async listInRange(businessId, from, to) {
        const rows = await prisma.appointment.findMany({
          where: { businessId, startAt: { gte: from, lt: to } },
          select: adminAppointmentSelect,
          orderBy: { startAt: "asc" },
        });
        return rows.map(toAdminAppointment);
      },

      // El filtro por estado actual va en el mismo UPDATE: dos cambios
      // concurrentes no pueden aplicarse ambos.
      async transitionFromConfirmed(userId, businessId, appointmentId, status) {
        const ownedWhere = { id: appointmentId, businessId, business: { ownerId: userId } };
        const { count } = await prisma.appointment.updateMany({
          where: { ...ownedWhere, status: "CONFIRMED" },
          data: { status },
        });
        const row = await prisma.appointment.findFirst({ where: ownedWhere, select: adminAppointmentSelect });
        return { appointment: row && toAdminAppointment(row), applied: count > 0 };
      },
    },

    users: {
      findByEmail: (email) =>
        prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, passwordHash: true },
        }),

      create: (data) =>
        rethrowConstraint(prisma.user.create({ data, select: { id: true, name: true, email: true } })),
    },
  };
}
