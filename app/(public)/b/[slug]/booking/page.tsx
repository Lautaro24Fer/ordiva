import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { BookingFlow } from "@/components/public/booking-flow";
import { PageShell } from "@/components/public/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerRepos } from "@/lib/repositories/server";
import { getBusinessPage, getBookingPage } from "@/modules/businesses/public-pages.service";

type Props = PageProps<"/b/[slug]/booking">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getBusinessPage(getServerRepos(), (await params).slug);
  return { title: data ? `Reservar en ${data.business.name}` : "Negocio no encontrado" };
}

export default function BookingPage({ params, searchParams }: Props) {
  return (
    <PageShell>
      <Suspense fallback={<BookingSkeleton />}>
        <BookingContent params={params} searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function BookingContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { slug } = await params;
  const { serviceId } = await searchParams;
  // La lista de días depende de la fecha actual: se calcula en cada request.
  await connection();
  const data = await getBookingPage(getServerRepos(), slug, new Date());
  if (!data) notFound();

  const requestedId = Number(serviceId);
  const initialServiceId = data.services.some((s) => s.id === requestedId) ? requestedId : undefined;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Link
          href={`/b/${slug}`}
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
          slug={slug}
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

function BookingSkeleton() {
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
