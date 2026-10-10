import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { PageShell } from "@/components/public/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { listDemoBusinesses } from "@/modules/businesses/public-pages.service";

export default function HomePage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Reservá tu turno online</h1>
          <p className="text-muted-foreground">
            Elegí un negocio, el servicio y el horario que te quede cómodo. Sin crear una cuenta.
          </p>
        </header>
        <section aria-labelledby="businesses-title" className="flex flex-col gap-3">
          <h2 id="businesses-title" className="text-lg font-medium">
            Negocios de demostración
          </h2>
          <Suspense fallback={<BusinessListSkeleton />}>
            <BusinessList />
          </Suspense>
        </section>
      </div>
    </PageShell>
  );
}

async function BusinessList() {
  // Datos vivos de la BD: siempre en request time, nunca horneados en el build.
  await connection();
  const businesses = await listDemoBusinesses();
  if (businesses.length === 0) {
    return <p className="text-muted-foreground">Todavía no hay negocios publicados.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {businesses.map((business) => (
        <li key={business.slug}>
          <Link
            href={`/b/${business.slug}`}
            className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{business.name}</span>
              {business.description && (
                <span className="text-sm text-muted-foreground">{business.description}</span>
              )}
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BusinessListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando negocios">
      <Skeleton className="h-18 rounded-xl" />
      <Skeleton className="h-18 rounded-xl" />
    </div>
  );
}
