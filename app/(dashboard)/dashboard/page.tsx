import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePageUserId } from "@/lib/session";
import { listOwnedBusinesses } from "@/modules/businesses/businesses.service";

export default function DashboardHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tus negocios</h1>
        <Link href="/dashboard/new" className={buttonVariants({ variant: "outline" })}>
          <Plus aria-hidden />
          Nuevo negocio
        </Link>
      </div>
      <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
        <BusinessList />
      </Suspense>
    </div>
  );
}

async function BusinessList() {
  const userId = await requirePageUserId();
  const businesses = await listOwnedBusinesses(userId);

  if (businesses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Todavía no creaste ningún negocio</CardTitle>
          <CardDescription>
            Creá tu negocio, cargá servicios y horarios, y compartí el link para recibir reservas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/new" className={buttonVariants()}>
            Crear mi negocio
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {businesses.map((business) => (
        <li key={business.id}>
          <Link
            href={`/dashboard/${business.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{business.name}</span>
              <span className="text-sm text-muted-foreground">/b/{business.slug}</span>
            </span>
            <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
