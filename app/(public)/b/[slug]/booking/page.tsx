import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBooking } from "@/components/demo/demo-pages";
import { BookingSkeleton, BookingView } from "@/components/public/booking-view";
import { PageShell } from "@/components/public/page-shell";
import { IS_DEMO } from "@/lib/demo/flag";
import { getServerRepos } from "@/lib/repositories/server";
import { getBusinessPage, getBookingPage } from "@/modules/businesses/public-pages.service";

type Props = PageProps<"/b/[slug]/booking">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // En la demo los negocios viven en el navegador: el servidor no los conoce.
  if (IS_DEMO) return { title: "Reservar turno" };
  const { slug } = await params;
  const data = await getBusinessPage(getServerRepos(), slug);
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
  const requestedServiceId = typeof serviceId === "string" ? serviceId : undefined;
  if (IS_DEMO) return <DemoBooking slug={slug} requestedServiceId={requestedServiceId} />;

  // La lista de días depende de la fecha actual: se calcula en cada request.
  await connection();
  const data = await getBookingPage(getServerRepos(), slug, new Date());
  if (!data) notFound();
  return <BookingView data={data} requestedServiceId={requestedServiceId} />;
}
