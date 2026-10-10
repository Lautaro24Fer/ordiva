import type { Metadata } from "next";
import { Suspense } from "react";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOwnedBusiness } from "@/lib/dashboard";
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
  const { userId, business } = await loadOwnedBusiness((await params).businessId);
  const services = await listServices(userId, business.id);
  return <ServicesManager businessId={business.id} services={services} />;
}
