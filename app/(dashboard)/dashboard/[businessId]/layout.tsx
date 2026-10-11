import { Suspense } from "react";
import { DemoBusinessHeader } from "@/components/demo/demo-pages";
import { BusinessHeader } from "@/components/dashboard/business-header";
import { Skeleton } from "@/components/ui/skeleton";
import { loadDashboardParams, loadOwnedBusiness } from "@/lib/dashboard";
import { IS_DEMO } from "@/lib/demo/flag";

export default function BusinessLayout({ children, params }: LayoutProps<"/dashboard/[businessId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-20 rounded-xl" />}>
        <Header params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function Header({ params }: Pick<LayoutProps<"/dashboard/[businessId]">, "params">) {
  const { businessId } = await params;
  if (IS_DEMO) return <DemoBusinessHeader {...await loadDashboardParams(businessId)} />;
  const { business } = await loadOwnedBusiness(businessId);
  return <BusinessHeader business={business} />;
}
