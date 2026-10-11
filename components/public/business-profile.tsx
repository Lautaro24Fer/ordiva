import { ServiceCard } from "@/components/public/service-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicService } from "@/modules/businesses/public-pages.service";

type Props = {
  business: { name: string; slug: string; description: string | null };
  services: PublicService[];
};

/** Página pública de un negocio: datos y servicios para reservar. */
export function BusinessProfile({ business, services }: Props) {
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

export function BusinessProfileSkeleton() {
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
