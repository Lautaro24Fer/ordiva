import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentActions } from "@/components/dashboard/appointment-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOwnedBusiness } from "@/lib/dashboard";
import { formatDuration, formatPrice } from "@/lib/format-display";
import { addLocalDays, formatLocalDateLong, toLocalDate, toLocalTimeLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { listAppointments } from "@/modules/appointments/appointments.service";
import { localDateSchema } from "@/schemas/common";

export const metadata: Metadata = { title: "Turnos" };

type Props = PageProps<"/dashboard/[businessId]">;

const STATUS = {
  CONFIRMED: { label: "Confirmado", variant: "default" },
  COMPLETED: { label: "Completado", variant: "secondary" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
} as const;

export default function AppointmentsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
      <AppointmentsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AppointmentsContent({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { userId, business } = await loadOwnedBusiness((await params).businessId);
  const requested = localDateSchema.safeParse((await searchParams).date);
  await connection();
  const today = toLocalDate(new Date(), business.timezone);
  const date = requested.success ? requested.data : today;

  const appointments = await listAppointments(userId, business.id, date);
  const confirmed = appointments.filter((a) => a.status === "CONFIRMED").length;
  const base = `/dashboard/${business.id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-medium first-letter:uppercase">{formatLocalDateLong(date)}</h2>
          <p className="text-sm text-muted-foreground">
            {confirmed} {confirmed === 1 ? "turno confirmado" : "turnos confirmados"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${base}?date=${addLocalDays(date, -1)}`}
            aria-label="Día anterior"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          <Link
            href={base}
            className={cn(buttonVariants({ variant: "outline" }), date === today && "pointer-events-none opacity-50")}
          >
            Hoy
          </Link>
          <Link
            href={`${base}?date=${addLocalDays(date, 1)}`}
            aria-label="Día siguiente"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronRight aria-hidden />
          </Link>
          {/* Formulario GET: funciona sin JavaScript. */}
          <form action={base} className="flex items-center gap-2">
            <label htmlFor="date" className="sr-only">
              Ir a la fecha
            </label>
            <Input id="date" name="date" type="date" defaultValue={date} className="w-auto" />
            <Button type="submit" variant="outline">
              Ir
            </Button>
          </form>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">
          No hay turnos para este día.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {appointments.map((appointment) => {
            const time = toLocalTimeLabel(new Date(appointment.startAt), business.timezone);
            const status = STATUS[appointment.status];
            return (
              <li
                key={appointment.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4",
                  appointment.status === "CANCELLED" && "opacity-60",
                )}
              >
                <div className="flex items-start gap-4">
                  <span className="w-12 text-lg font-semibold tabular-nums">{time}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      {appointment.customerName}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </span>
                    <span className="text-sm break-all text-muted-foreground">{appointment.customerContact}</span>
                    <span className="text-sm text-muted-foreground">
                      {appointment.service.name} · {formatDuration(appointment.serviceDurationMinutes)} ·{" "}
                      {formatPrice(appointment.servicePrice)}
                    </span>
                  </div>
                </div>
                {appointment.status === "CONFIRMED" && (
                  <AppointmentActions
                    businessId={business.id}
                    appointmentId={appointment.id}
                    summary={`${appointment.customerName} a las ${time}`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
