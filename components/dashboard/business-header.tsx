import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BusinessNav } from "@/components/dashboard/business-nav";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { buttonVariants } from "@/components/ui/button";

/** Encabezado común de las secciones de un negocio en el panel. */
export function BusinessHeader({ business }: { business: { id: number; name: string; slug: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="self-start text-sm text-muted-foreground hover:text-foreground max-sm:-my-3 max-sm:py-3">
            Tus negocios
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton path={`/b/${business.slug}`} />
          <Link href={`/b/${business.slug}`} target="_blank" className={buttonVariants({ variant: "ghost" })}>
            Ver página pública
            <ExternalLink aria-hidden />
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </Link>
        </div>
      </div>
      <BusinessNav businessId={business.id} />
    </div>
  );
}
