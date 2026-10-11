import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AppError } from "@/lib/errors";
import { getServerRepos } from "@/lib/repositories/server";
import { requirePageUserId } from "@/lib/session";
import { requireOwnedBusiness } from "@/modules/businesses/businesses.service";
import { idParamSchema } from "@/schemas/common";

/**
 * Sesión + id de negocio válido (formato). En la demo, la pertenencia del
 * negocio la verifica el cliente contra localStorage.
 */
export async function loadDashboardParams(businessIdParam: string) {
  const userId = await requirePageUserId();
  const parsed = idParamSchema.safeParse(businessIdParam);
  if (!parsed.success) notFound();
  return { userId, businessId: parsed.data };
}

/**
 * Para páginas del panel bajo /dashboard/[businessId]: exige sesión y que el
 * negocio sea del usuario. Un id inválido o ajeno muestra 404 (no revela si
 * existe). `cache` evita repetir la consulta entre layout y página.
 */
export const loadOwnedBusiness = cache(async (businessIdParam: string) => {
  const { userId, businessId } = await loadDashboardParams(businessIdParam);
  try {
    const business = await requireOwnedBusiness(getServerRepos(), userId, businessId);
    return { userId, business };
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
});
