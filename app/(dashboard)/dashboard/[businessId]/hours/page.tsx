import type { Metadata } from "next";
import { Suspense } from "react";
import { HoursEditor } from "@/components/dashboard/hours-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOwnedBusiness } from "@/lib/dashboard";
import { getHours } from "@/modules/businesses/businesses.service";

export const metadata: Metadata = { title: "Horarios" };

type Props = PageProps<"/dashboard/[businessId]/hours">;

export default function HoursPage({ params }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Podés cargar varias franjas por día (por ejemplo, mañana y tarde). Sin franjas, el día figura cerrado.
      </p>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <HoursContent params={params} />
      </Suspense>
    </div>
  );
}

async function HoursContent({ params }: Pick<Props, "params">) {
  const { userId, business } = await loadOwnedBusiness((await params).businessId);
  const hours = await getHours(userId, business.id);
  return (
    <>
      <p className="text-sm text-muted-foreground">Horarios en la zona del negocio ({business.timezone}).</p>
      <HoursEditor businessId={business.id} hours={hours} />
    </>
  );
}
