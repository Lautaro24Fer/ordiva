import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/public/page-shell";
import { ServiceCard } from "@/components/public/service-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerRepos } from "@/lib/repositories/server";
import { getBusinessPage } from "@/modules/businesses/public-pages.service";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const data = await getBusinessPage(getServerRepos(), (await params).slug);
  if (!data) return { title: "Negocio no encontrado" };
  return { title: data.business.name, description: data.business.description ?? undefined };
}

export default function BusinessPage({ params }: PageProps<"/b/[slug]">) {
  return (
    <PageShell>
      <Suspense fallback={<BusinessSkeleton />}>
        <BusinessContent params={params} />
      </Suspense>
    </PageShell>
  );
}

async function BusinessContent({ params }: { params: PageProps<"/b/[slug]">["params"] }) {
  const { slug } = await params;
  const data = await getBusinessPage(getServerRepos(), slug);
  if (!data) notFound();
  const { business, services } = data;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{business.name}</h1>
        {business.description && <p className="text-muted-foreground">{business.description}</p>}
      </header>

      <section aria-labelledby="services-title" className="flex flex-col gap-4">
        <h2 id="services-title" className="text-lg font-medium">
          Servicios
        </h2>
        {services.length === 0 ? (
          <p className="text-muted-foreground">Este negocio todavía no publicó servicios.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {services.map((service) => (
              <li key={service.id}>
                <ServiceCard
                  service={service}
                  bookingHref={`/b/${business.slug}/booking?serviceId=${service.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BusinessSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando negocio">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
