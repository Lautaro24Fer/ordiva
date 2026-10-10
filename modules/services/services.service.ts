import "server-only";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import type { CreateServiceInput, UpdateServiceInput } from "@/schemas/services";
import { requireOwnedBusiness } from "@/modules/businesses/businesses.service";

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  price: true,
  isActive: true,
} as const;

type ServiceRow = {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: { toFixed(decimals: number): string };
  isActive: boolean;
};

/** Importes como string decimal ("15000.00") para no perder precisión en JSON. */
export function serializeService(service: ServiceRow) {
  return { ...service, price: service.price.toFixed(2) };
}

/** Versión pública: sin `isActive` (solo se listan activos). */
function serializePublicService(service: ServiceRow) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: service.price.toFixed(2),
  };
}

export async function listPublicServices(slug: string) {
  const business = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (!business) throw notFound("Negocio no encontrado");

  const services = await prisma.service.findMany({
    where: { businessId: business.id, isActive: true },
    select: serviceSelect,
    orderBy: { name: "asc" },
  });
  return services.map(serializePublicService);
}

export async function listServices(userId: number, businessId: number) {
  await requireOwnedBusiness(userId, businessId);
  const services = await prisma.service.findMany({
    where: { businessId },
    select: serviceSelect,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return services.map(serializeService);
}

export async function createService(userId: number, businessId: number, input: CreateServiceInput) {
  await requireOwnedBusiness(userId, businessId);
  const service = await prisma.service.create({
    data: { ...input, description: input.description ?? null, businessId },
    select: serviceSelect,
  });
  return serializeService(service);
}

/**
 * Edita un servicio propio. Cambiar precio/duración solo afecta reservas
 * nuevas: los turnos guardan su propio snapshot.
 */
export async function updateService(
  userId: number,
  businessId: number,
  serviceId: number,
  input: UpdateServiceInput,
) {
  const where = { id: serviceId, businessId, business: { ownerId: userId } };
  const { count } = await prisma.service.updateMany({ where, data: input });
  if (count === 0) throw notFound("Servicio no encontrado");
  return serializeService(await prisma.service.findFirstOrThrow({ where, select: serviceSelect }));
}

/** "Borrado" lógico: retira el servicio de la oferta y conserva el histórico. */
export function deactivateService(userId: number, businessId: number, serviceId: number) {
  return updateService(userId, businessId, serviceId, { isActive: false });
}
