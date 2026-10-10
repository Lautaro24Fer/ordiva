import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AppError } from "@/lib/errors";
import { requirePageUserId } from "@/lib/session";
import { requireOwnedBusiness } from "@/modules/businesses/businesses.service";
import { idParamSchema } from "@/schemas/common";

/**
 * Para páginas del panel bajo /dashboard/[businessId]: exige sesión y que el
 * negocio sea del usuario. Un id inválido o ajeno muestra 404 (no revela si
 * existe). `cache` evita repetir la consulta entre layout y página.
 */
export const loadOwnedBusiness = cache(async (businessIdParam: string) => {
  const userId = await requirePageUserId();
  const parsed = idParamSchema.safeParse(businessIdParam);
  if (!parsed.success) notFound();

  try {
    const business = await requireOwnedBusiness(userId, parsed.data);
    return { userId, business };
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
});
