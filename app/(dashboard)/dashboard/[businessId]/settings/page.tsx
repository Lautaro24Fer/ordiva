import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "@/components/dashboard/settings-view";
import { DemoSettings } from "@/components/demo/demo-pages";
import { Skeleton } from "@/components/ui/skeleton";
import { loadDashboardParams, loadOwnedBusiness } from "@/lib/dashboard";
import { IS_DEMO } from "@/lib/demo/flag";
import { getServerRepos } from "@/lib/repositories/server";
import { getBookingRule } from "@/modules/businesses/businesses.service";

export const metadata: Metadata = { title: "Configuración" };

type Props = PageProps<"/dashboard/[businessId]/settings">;

export default function SettingsPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <SettingsContent params={params} />
    </Suspense>
  );
}

async function SettingsContent({ params }: Pick<Props, "params">) {
  const { businessId } = await params;
  if (IS_DEMO) return <DemoSettings {...await loadDashboardParams(businessId)} />;

  const { userId, business } = await loadOwnedBusiness(businessId);
  const rule = await getBookingRule(getServerRepos(), userId, business.id);
  return <SettingsView business={business} rule={rule} />;
}
