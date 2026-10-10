"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CalendarCheck, Clock, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingForm, type BookedAppointment } from "@/components/public/booking-form";
import { formatDuration, formatPrice } from "@/lib/format-display";
import { cn } from "@/lib/utils";
import type { BookingDay } from "@/modules/availability/booking-days";
import type { PublicService } from "@/modules/businesses/public-pages.service";

type Slot = { startAt: string; endAt: string; label: string };

type SlotsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; slots: Slot[] }
  | { status: "error"; message: string };

type Confirmation = BookedAppointment & { day: BookingDay; timeLabel: string };

export type BookingFlowProps = {
  slug: string;
  businessName: string;
  timezone: string;
  services: PublicService[];
  days: BookingDay[];
  initialServiceId?: number;
};

/** "America/Argentina/Buenos_Aires" → "Buenos Aires". */
function zoneCity(timezone: string): string {
  return timezone.split("/").pop()!.replaceAll("_", " ");
}

export function BookingFlow({ slug, businessName, timezone, services, days, initialServiceId }: BookingFlowProps) {
  const [serviceId, setServiceId] = useState<number | undefined>(initialServiceId);
  const [date, setDate] = useState<string>();
  const [slotsState, setSlotsState] = useState<SlotsState>({ status: "idle" });
  const [selectedSlot, setSelectedSlot] = useState<Slot>();
  const [notice, setNotice] = useState<string>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  // Ignora respuestas viejas si la persona cambia de día/servicio rápido.
  const latestRequest = useRef(0);

  const service = services.find((s) => s.id === serviceId);
  const day = days.find((d) => d.date === date);

  async function loadSlots(nextServiceId: number, nextDate: string) {
    const requestId = ++latestRequest.current;
    setSelectedSlot(undefined);
    setSlotsState({ status: "loading" });
    try {
      const params = new URLSearchParams({ serviceId: String(nextServiceId), date: nextDate });
      const res = await fetch(`/api/businesses/${slug}/availability?${params}`, { cache: "no-store" });
      const body = await res.json();
      if (requestId !== latestRequest.current) return;
      if (!res.ok) {
        setSlotsState({ status: "error", message: body?.error?.message ?? "No pudimos cargar los horarios." });
        return;
      }
      setSlotsState({ status: "ready", slots: body.slots });
    } catch {
      if (requestId === latestRequest.current) {
        setSlotsState({ status: "error", message: "Error de conexión. Revisá tu internet y probá de nuevo." });
      }
    }
  }

  function selectService(id: number) {
    setServiceId(id);
    setNotice(undefined);
    if (date) void loadSlots(id, date);
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    setNotice(undefined);
    if (serviceId) void loadSlots(serviceId, nextDate);
  }

  function handleSlotTaken() {
    setNotice("Ese horario se acaba de ocupar. Elegí otro de la lista actualizada.");
    if (serviceId && date) void loadSlots(serviceId, date);
  }

  function restart() {
    setConfirmation(undefined);
    setSelectedSlot(undefined);
    setNotice(undefined);
    if (serviceId && date) void loadSlots(serviceId, date);
  }

  if (confirmation) {
    return <BookingConfirmation confirmation={confirmation} slug={slug} businessName={businessName} onRestart={restart} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <Step number={1} title="Elegí el servicio">
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Servicios">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === serviceId}
              onClick={() => selectService(s.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border bg-card p-3 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                s.id === serviceId && "border-primary bg-primary/5 hover:bg-primary/10",
              )}
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground">
                {formatDuration(s.durationMinutes)} · {formatPrice(s.price)}
              </span>
            </button>
          ))}
        </div>
      </Step>

      <Step number={2} title="Elegí el día">
        <div
          className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2"
          role="group"
          aria-label="Días disponibles"
        >
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              disabled={!d.isOpen}
              aria-pressed={d.date === date}
              aria-label={`${d.weekday} ${d.label}${d.isOpen ? "" : ", cerrado"}`}
              onClick={() => selectDate(d.date)}
              className={cn(
                "flex w-16 shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border bg-card py-2 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
                d.date === date && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <span className="text-xs uppercase opacity-80">{d.weekday}</span>
              <span className="font-medium">{d.label}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step number={3} title="Elegí el horario" description={`Horarios en hora de ${zoneCity(timezone)}.`}>
        {notice && (
          <Alert>
            <TriangleAlert aria-hidden />
            <AlertTitle>Horario no disponible</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
        <SlotPicker
          state={slotsState}
          canLoad={Boolean(service && day)}
          selected={selectedSlot}
          onSelect={(slot) => {
            setSelectedSlot(slot);
            setNotice(undefined);
          }}
          onRetry={() => serviceId && date && loadSlots(serviceId, date)}
        />
      </Step>

      {service && day && selectedSlot && (
        <Step number={4} title="Tus datos">
          <p className="text-sm text-muted-foreground">
            {service.name} · {day.weekday} {day.label} a las {selectedSlot.label} · {formatPrice(service.price)}
          </p>
          <BookingForm
            key={selectedSlot.startAt}
            slug={slug}
            serviceId={service.id}
            startAt={selectedSlot.startAt}
            onBooked={(appointment) =>
              setConfirmation({ ...appointment, day, timeLabel: selectedSlot.label })
            }
            onSlotTaken={handleSlotTaken}
          />
        </Step>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const id = `step-${number}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="flex items-center gap-2 text-base font-medium">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {number}
          </span>
          {title}
        </h2>
        {description && <p className="pl-8 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SlotPicker({
  state,
  canLoad,
  selected,
  onSelect,
  onRetry,
}: {
  state: SlotsState;
  canLoad: boolean;
  selected?: Slot;
  onSelect: (slot: Slot) => void;
  onRetry: () => void;
}) {
  if (!canLoad || state.status === "idle") {
    return <p className="text-sm text-muted-foreground">Elegí un servicio y un día para ver los horarios libres.</p>;
  }

  if (state.status === "loading") {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-busy="true" aria-label="Cargando horarios">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <TriangleAlert aria-hidden />
        <AlertTitle>No pudimos cargar los horarios</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          {state.message}
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (state.slots.length === 0) {
    return <p className="text-sm text-muted-foreground">No quedan horarios libres ese día. Probá con otro.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="Horarios libres">
      {state.slots.map((slot) => (
        <Button
          key={slot.startAt}
          type="button"
          variant={selected?.startAt === slot.startAt ? "default" : "outline"}
          aria-pressed={selected?.startAt === slot.startAt}
          className="tabular-nums"
          onClick={() => onSelect(slot)}
        >
          {slot.label}
        </Button>
      ))}
    </div>
  );
}

function BookingConfirmation({
  confirmation,
  slug,
  businessName,
  onRestart,
}: {
  confirmation: Confirmation;
  slug: string;
  businessName: string;
  onRestart: () => void;
}) {
  const { service, day, timeLabel } = confirmation;
  return (
    <Card>
      <CardHeader>
        <CalendarCheck aria-hidden className="mb-2 size-8 text-primary" />
        <CardTitle className="text-xl">¡Turno confirmado!</CardTitle>
        <CardDescription>Te esperamos en {businessName}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Servicio</dt>
          <dd className="font-medium">{service.name}</dd>
          <dt className="text-muted-foreground">Día</dt>
          <dd className="font-medium first-letter:uppercase">
            {day.weekday} {day.label}
          </dd>
          <dt className="text-muted-foreground">Hora</dt>
          <dd className="inline-flex items-center gap-1.5 font-medium">
            <Clock aria-hidden className="size-4" />
            {timeLabel} ({formatDuration(service.durationMinutes)})
          </dd>
          <dt className="text-muted-foreground">Precio</dt>
          <dd className="font-medium">{formatPrice(service.price)}</dd>
          <dt className="text-muted-foreground">Reserva</dt>
          <dd className="font-medium tabular-nums">#{confirmation.id}</dd>
        </dl>
        <p className="text-sm text-muted-foreground">
          Si necesitás cancelar, comunicate directamente con el negocio.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRestart}>
            Reservar otro turno
          </Button>
          <Link href={`/b/${slug}`} className={buttonVariants({ variant: "ghost" })}>
            Volver al negocio
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
