import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarClock, ChevronRight, LayoutDashboard, Link2, SlidersHorizontal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerRepos } from "@/lib/repositories/server";
import { getSessionUserId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { listDemoBusinesses } from "@/modules/businesses/public-pages.service";

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Agenda abierta las 24 horas",
    description: "Tus clientes reservan solos, a cualquier hora, sin llamadas ni mensajes.",
  },
  {
    icon: SlidersHorizontal,
    title: "Servicios y horarios a tu medida",
    description: "Definí duración, precio y franjas por día. Los turnos libres se calculan solos.",
  },
  {
    icon: Link2,
    title: "Un link para compartir",
    description: "Tu página de reservas lista para poner en Instagram, WhatsApp o Google.",
  },
];

const heroButton = "h-11 px-5 text-base";

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="border-b bg-linear-to-b from-accent to-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
          <p className="rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            Peluquerías · Barberías · Centros de estética
          </p>
          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Reservá tu turno online, sin vueltas
            </h1>
            <p className="text-lg text-pretty text-muted-foreground">
              Elegí el negocio, el servicio y el horario que te quede cómodo. No necesitás crear una cuenta.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="#negocios" className={cn(buttonVariants({ size: "lg" }), heroButton)}>
              Ver negocios
            </Link>
            <Link href="#para-negocios" className={cn(buttonVariants({ variant: "outline", size: "lg" }), heroButton)}>
              Tengo un negocio
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="negocios-title" id="negocios" className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
        <div className="mb-6 flex flex-col gap-1">
          <h2 id="negocios-title" className="text-2xl font-semibold tracking-tight">
            Elegí dónde reservar
          </h2>
          <p className="text-muted-foreground">Negocios de demostración con datos ficticios.</p>
        </div>
        <Suspense fallback={<BusinessListSkeleton />}>
          <BusinessList />
        </Suspense>
      </section>

      <section aria-labelledby="para-negocios-title" id="para-negocios" className="border-t bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 sm:py-16">
          <div className="flex max-w-2xl flex-col gap-2">
            <h2 id="para-negocios-title" className="text-2xl font-semibold tracking-tight text-balance">
              ¿Tenés un negocio? Recibí reservas mientras trabajás
            </h2>
            <p className="text-muted-foreground">
              Cargá tus servicios y horarios una vez y compartí tu link. Del resto se ocupa la agenda.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex flex-col gap-3 rounded-xl border bg-background p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Suspense fallback={<Skeleton className="h-11 w-36 rounded-lg" />}>
              <OwnerActions />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}

/** Con sesión iniciada, "Crear cuenta" no aplica: se ofrece volver al panel. */
async function OwnerActions() {
  if ((await getSessionUserId()) !== null) {
    return (
      <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), heroButton)}>
        <LayoutDashboard aria-hidden />
        Ir a mi panel
      </Link>
    );
  }
  return (
    <>
      <Link href="/register" className={cn(buttonVariants({ size: "lg" }), heroButton)}>
        Crear cuenta
      </Link>
      <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), heroButton)}>
        Ya tengo cuenta
      </Link>
    </>
  );
}

async function BusinessList() {
  // Datos vivos de la BD: siempre en request time, nunca horneados en el build.
  await connection();
  const businesses = await listDemoBusinesses(getServerRepos());
  if (businesses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">
        Todavía no hay negocios publicados.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {businesses.map((business) => (
        <li key={business.slug}>
          <Link
            href={`/b/${business.slug}`}
            className="flex h-full items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
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
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Cargando negocios">
      <Skeleton className="h-18 rounded-xl" />
      <Skeleton className="h-18 rounded-xl" />
    </div>
  );
}
