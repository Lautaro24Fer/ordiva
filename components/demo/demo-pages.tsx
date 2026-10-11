"use client";

import Link from "next/link";
import { AppointmentsDay } from "@/components/dashboard/appointments-day";
import { BusinessHeader } from "@/components/dashboard/business-header";
import { HoursEditor } from "@/components/dashboard/hours-editor";
import { OwnedBusinessList } from "@/components/dashboard/owned-business-list";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { SettingsView } from "@/components/dashboard/settings-view";
import { BookingSkeleton, BookingView } from "@/components/public/booking-view";
import { BusinessDirectory, BusinessDirectorySkeleton } from "@/components/public/business-directory";
import { BusinessNotFound } from "@/components/public/business-not-found";
import { BusinessProfile, BusinessProfileSkeleton } from "@/components/public/business-profile";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoQuery } from "@/lib/demo/use-demo-query";
import { toLocalDate } from "@/lib/time";
import { listAppointments } from "@/modules/appointments/appointments.service";
import {
  getBookingRule,
  getHours,
  listOwnedBusinesses,
  requireOwnedBusiness,
} from "@/modules/businesses/businesses.service";
import { getBookingPage, getBusinessPage, listDemoBusinesses } from "@/modules/businesses/public-pages.service";
import { listServices } from "@/modules/services/services.service";

/**
 * Variantes de las páginas para el modo demo: los datos salen de localStorage
 * (en el navegador) con los mismos servicios que usan las páginas del
 * servidor, y se renderizan con los mismos componentes de vista.
 */

type DashboardProps = { userId: number; businessId: number };

function DashboardNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border bg-card p-6">
      <h1 className="text-xl font-semibold">Negocio no encontrado</h1>
      <p className="text-muted-foreground">No existe o no pertenece a tu cuenta.</p>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        Volver a tus negocios
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------

export function DemoBusinessDirectory() {
  const query = useDemoQuery("directory", (repos) => listDemoBusinesses(repos));
  if (query.status !== "ready") return <BusinessDirectorySkeleton />;
  return <BusinessDirectory businesses={query.data} />;
}

export function DemoBusinessProfile({ slug }: { slug: string }) {
  const query = useDemoQuery(slug, (repos) => getBusinessPage(repos, slug));
  if (query.status === "loading") return <BusinessProfileSkeleton />;
  if (query.status === "not-found") return <BusinessNotFound />;
  return <BusinessProfile business={query.data.business} services={query.data.services} />;
}

export function DemoBooking({ slug, requestedServiceId }: { slug: string; requestedServiceId?: string }) {
  const query = useDemoQuery(slug, (repos) => getBookingPage(repos, slug, new Date()));
  if (query.status === "loading") return <BookingSkeleton />;
  if (query.status === "not-found") return <BusinessNotFound />;
  return <BookingView data={query.data} requestedServiceId={requestedServiceId} />;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function DemoOwnedBusinesses({ userId }: { userId: number }) {
  const query = useDemoQuery(`owned:${userId}`, (repos) => listOwnedBusinesses(repos, userId));
  if (query.status !== "ready") return <Skeleton className="h-24 rounded-xl" />;
  return <OwnedBusinessList businesses={query.data} />;
}

export function DemoBusinessHeader({ userId, businessId }: DashboardProps) {
  const query = useDemoQuery(`${userId}:${businessId}`, (repos) => requireOwnedBusiness(repos, userId, businessId));
  if (query.status === "loading") return <Skeleton className="h-20 rounded-xl" />;
  // El "no encontrado" lo muestra la sección; el encabezado no se repite.
  if (query.status === "not-found") return null;
  return <BusinessHeader business={query.data} />;
}

export function DemoAppointments({ userId, businessId, requestedDate }: DashboardProps & { requestedDate?: string }) {
  const query = useDemoQuery(`${userId}:${businessId}:${requestedDate}`, async (repos) => {
    const business = await requireOwnedBusiness(repos, userId, businessId);
    const today = toLocalDate(new Date(), business.timezone);
    const date = requestedDate ?? today;
    const appointments = await listAppointments(repos, userId, businessId, date);
    return { business, today, date, appointments };
  });
  if (query.status === "loading") return <Skeleton className="h-64 rounded-xl" />;
  if (query.status === "not-found") return <DashboardNotFound />;
  return <AppointmentsDay {...query.data} />;
}

export function DemoHours({ userId, businessId }: DashboardProps) {
  const query = useDemoQuery(`${userId}:${businessId}`, async (repos) => {
    const business = await requireOwnedBusiness(repos, userId, businessId);
    return { business, hours: await getHours(repos, userId, businessId) };
  });
  if (query.status === "loading") return <Skeleton className="h-96 rounded-xl" />;
  if (query.status === "not-found") return <DashboardNotFound />;
  return (
    <>
      <p className="text-sm text-muted-foreground">Horarios en la zona del negocio ({query.data.business.timezone}).</p>
      <HoursEditor businessId={businessId} hours={query.data.hours} />
    </>
  );
}

export function DemoServices({ userId, businessId }: DashboardProps) {
  const query = useDemoQuery(`${userId}:${businessId}`, (repos) => listServices(repos, userId, businessId));
  if (query.status === "loading") return <Skeleton className="h-64 rounded-xl" />;
  if (query.status === "not-found") return <DashboardNotFound />;
  return <ServicesManager businessId={businessId} services={query.data} />;
}

export function DemoSettings({ userId, businessId }: DashboardProps) {
  const query = useDemoQuery(`${userId}:${businessId}`, async (repos) => {
    const business = await requireOwnedBusiness(repos, userId, businessId);
    return { business, rule: await getBookingRule(repos, userId, businessId) };
  });
  if (query.status === "loading") return <Skeleton className="h-96 rounded-xl" />;
  if (query.status === "not-found") return <DashboardNotFound />;
  return <SettingsView business={query.data.business} rule={query.data.rule} />;
}
