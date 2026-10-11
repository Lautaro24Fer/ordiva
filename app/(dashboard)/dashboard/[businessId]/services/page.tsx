import type { Metadata } from "next";
import { Suspense } from "react";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { DemoServices } from "@/components/demo/demo-pages";
import { Skeleton } from "@/components/ui/skeleton";
import { loadDashboardParams, loadOwnedBusiness } from "@/lib/dashboard";
import { IS_DEMO } from "@/lib/demo/flag";
import { getServerRepos } from "@/lib/repositories/server";
import { listServices } from "@/modules/services/services.service";

export const metadata: Metadata = { title: "Servicios" };

type Props = PageProps<"/dashboard/[businessId]/services">;

export default function ServicesPage({ params }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Los servicios inactivos no se pueden reservar, pero se conservan en el historial. Cambiar precio o duración
        solo afecta a las reservas nuevas.
      </p>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <ServicesContent params={params} />
      </Suspense>
    </div>
  );
}

async function ServicesContent({ params }: Pick<Props, "params">) {
  const { businessId } = await params;
  if (IS_DEMO) return <DemoServices {...await loadDashboardParams(businessId)} />;

  const { userId, business } = await loadOwnedBusiness(businessId);
  const services = await listServices(getServerRepos(), userId, business.id);
  return <ServicesManager businessId={business.id} services={services} />;
}
