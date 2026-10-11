import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type DirectoryBusiness = { name: string; slug: string; description: string | null };

/** Listado de negocios del inicio. */
export function BusinessDirectory({ businesses }: { businesses: DirectoryBusiness[] }) {
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

export function BusinessDirectorySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Cargando negocios">
      <Skeleton className="h-18 rounded-xl" />
      <Skeleton className="h-18 rounded-xl" />
    </div>
  );
}
