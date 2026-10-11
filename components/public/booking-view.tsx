import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BookingFlow } from "@/components/public/booking-flow";
import { Skeleton } from "@/components/ui/skeleton";
import type { getBookingPage } from "@/modules/businesses/public-pages.service";

type BookingPageData = NonNullable<Awaited<ReturnType<typeof getBookingPage>>>;

/** Encabezado + flujo de reserva. `requestedServiceId` viene del query string (sin validar). */
export function BookingView({ data, requestedServiceId }: { data: BookingPageData; requestedServiceId?: string }) {
  const requestedId = Number(requestedServiceId);
  const initialServiceId = data.services.some((s) => s.id === requestedId) ? requestedId : undefined;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Link
          href={`/b/${data.business.slug}`}
          className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {data.business.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Reservá tu turno</h1>
      </header>

      {data.services.length === 0 ? (
        <p className="text-muted-foreground">Este negocio no tiene servicios disponibles para reservar.</p>
      ) : (
        <BookingFlow
          slug={data.business.slug}
          businessName={data.business.name}
          timezone={data.business.timezone}
          services={data.services}
          days={data.days}
          initialServiceId={initialServiceId}
        />
      )}
    </div>
  );
}

export function BookingSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando reserva">
      <Skeleton className="h-8 w-1/2" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-16 shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
