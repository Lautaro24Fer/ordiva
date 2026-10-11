import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentActions } from "@/components/dashboard/appointment-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration, formatPrice } from "@/lib/format-display";
import { addLocalDays, formatLocalDateLong, toLocalTimeLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { listAppointments } from "@/modules/appointments/appointments.service";

const STATUS = {
  CONFIRMED: { label: "Confirmado", variant: "success" },
  COMPLETED: { label: "Completado", variant: "secondary" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
} as const;

type Props = {
  business: { id: number; timezone: string };
  /** Día mostrado y "hoy", ambos como fecha local del negocio (YYYY-MM-DD). */
  date: string;
  today: string;
  appointments: Awaited<ReturnType<typeof listAppointments>>;
};

/** Agenda de un día: navegación por fecha y turnos con sus acciones. */
export function AppointmentsDay({ business, date, today, appointments }: Props) {
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
        <nav aria-label="Elegir día" className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Link
            href={`${base}?date=${addLocalDays(date, -1)}`}
            aria-label="Día anterior"
            className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "max-sm:size-11")}
          >
            <ChevronLeft aria-hidden />
          </Link>
          {/* Ya en hoy: botón deshabilitado (no enfocable) en lugar de un link "apagado". */}
          {date === today ? (
            <Button variant="outline" size="lg" disabled className="max-sm:h-11">
              Hoy
            </Button>
          ) : (
            <Link href={base} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "max-sm:h-11")}>
              Hoy
            </Link>
          )}
          <Link
            href={`${base}?date=${addLocalDays(date, 1)}`}
            aria-label="Día siguiente"
            className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "max-sm:size-11")}
          >
            <ChevronRight aria-hidden />
          </Link>
          {/* Formulario GET: funciona sin JavaScript. */}
          <form action={base} className="flex flex-1 items-center gap-2 sm:flex-none">
            <label htmlFor="date" className="sr-only">
              Ir a la fecha
            </label>
            <Input id="date" name="date" type="date" defaultValue={date} className="h-9 min-w-0 flex-1 max-sm:h-11 sm:w-auto sm:flex-none" />
            <Button type="submit" variant="outline" size="lg" className="max-sm:h-11 max-sm:px-4">
              Ir
            </Button>
          </form>
        </nav>
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
                  appointment.status === "CANCELLED" && "border-dashed bg-muted/40",
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
