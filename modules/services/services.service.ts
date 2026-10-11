import { notFound } from "@/lib/errors";
import type { Repositories, ServiceRow } from "@/modules/repositories";
import type { CreateServiceInput, UpdateServiceInput } from "@/schemas/services";
import { requireOwnedBusiness } from "@/modules/businesses/businesses.service";

/** Versión pública: sin `isActive` (solo se listan activos). */
function toPublicService({ id, name, description, durationMinutes, price }: ServiceRow) {
  return { id, name, description, durationMinutes, price };
}

export async function listPublicServices(repos: Repositories, slug: string) {
  const business = await repos.businesses.findBySlug(slug);
  if (!business) throw notFound("Negocio no encontrado");

  const services = await repos.services.list(business.id, { activeOnly: true });
  return services.map(toPublicService);
}

export async function listServices(repos: Repositories, userId: number, businessId: number) {
  await requireOwnedBusiness(repos, userId, businessId);
  return repos.services.list(businessId, { activeOnly: false });
}

export async function createService(
  repos: Repositories,
  userId: number,
  businessId: number,
  input: CreateServiceInput,
) {
  await requireOwnedBusiness(repos, userId, businessId);
  return repos.services.create(businessId, { ...input, description: input.description ?? null });
}

/**
 * Edita un servicio propio. Cambiar precio/duración solo afecta reservas
 * nuevas: los turnos guardan su propio snapshot.
 */
export async function updateService(
  repos: Repositories,
  userId: number,
  businessId: number,
  serviceId: number,
  input: UpdateServiceInput,
) {
  const service = await repos.services.update(userId, businessId, serviceId, input);
  if (!service) throw notFound("Servicio no encontrado");
  return service;
}

/** "Borrado" lógico: retira el servicio de la oferta y conserva el histórico. */
export function deactivateService(repos: Repositories, userId: number, businessId: number, serviceId: number) {
  return updateService(repos, userId, businessId, serviceId, { isActive: false });
}
