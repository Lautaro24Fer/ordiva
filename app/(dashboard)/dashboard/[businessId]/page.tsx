import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppointmentsDay } from "@/components/dashboard/appointments-day";
import { DemoAppointments } from "@/components/demo/demo-pages";
import { Skeleton } from "@/components/ui/skeleton";
import { loadDashboardParams, loadOwnedBusiness } from "@/lib/dashboard";
import { IS_DEMO } from "@/lib/demo/flag";
import { getServerRepos } from "@/lib/repositories/server";
import { toLocalDate } from "@/lib/time";
import { listAppointments } from "@/modules/appointments/appointments.service";
import { localDateSchema } from "@/schemas/common";

export const metadata: Metadata = { title: "Turnos" };

type Props = PageProps<"/dashboard/[businessId]">;

export default function AppointmentsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
      <AppointmentsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AppointmentsContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { businessId } = await params;
  const requested = localDateSchema.safeParse((await searchParams).date);
  const requestedDate = requested.success ? requested.data : undefined;
  if (IS_DEMO) {
    return <DemoAppointments {...await loadDashboardParams(businessId)} requestedDate={requestedDate} />;
  }

  const { userId, business } = await loadOwnedBusiness(businessId);
  await connection();
  const today = toLocalDate(new Date(), business.timezone);
  const date = requestedDate ?? today;
  const appointments = await listAppointments(getServerRepos(), userId, business.id, date);
  return <AppointmentsDay business={business} date={date} today={today} appointments={appointments} />;
}
