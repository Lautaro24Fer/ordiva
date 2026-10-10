import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { BusinessNav } from "@/components/dashboard/business-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOwnedBusiness } from "@/lib/dashboard";

export default function BusinessLayout({ children, params }: LayoutProps<"/dashboard/[businessId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-20 rounded-xl" />}>
        <BusinessHeader params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function BusinessHeader({ params }: Pick<LayoutProps<"/dashboard/[businessId]">, "params">) {
  const { business } = await loadOwnedBusiness((await params).businessId);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Tus negocios
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
        </div>
        <Link
          href={`/b/${business.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Ver página pública
          <ExternalLink aria-hidden className="size-3.5" />
        </Link>
      </div>
      <BusinessNav businessId={business.id} />
    </div>
  );
}
