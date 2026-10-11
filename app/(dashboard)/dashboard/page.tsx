import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { DemoOwnedBusinesses } from "@/components/demo/demo-pages";
import { OwnedBusinessList } from "@/components/dashboard/owned-business-list";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IS_DEMO } from "@/lib/demo/flag";
import { getServerRepos } from "@/lib/repositories/server";
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
  if (IS_DEMO) return <DemoOwnedBusinesses userId={userId} />;
  return <OwnedBusinessList businesses={await listOwnedBusinesses(getServerRepos(), userId)} />;
}
