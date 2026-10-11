import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OwnedBusiness = { id: number; name: string; slug: string };

/** Negocios del administrador en la portada del panel. */
export function OwnedBusinessList({ businesses }: { businesses: OwnedBusiness[] }) {
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
            className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
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
