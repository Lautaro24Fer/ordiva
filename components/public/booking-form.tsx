"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { bookingFormSchema } from "@/schemas/appointments";

type FormInput = z.input<typeof bookingFormSchema>;
type FormOutput = z.output<typeof bookingFormSchema>;

/** Respuesta 201 de POST /api/businesses/[slug]/appointments. */
export type BookedAppointment = {
  id: number;
  startAt: string;
  endAt: string;
  status: string;
  service: { id: number; name: string; durationMinutes: number; price: string };
};

type BookingFormProps = {
  slug: string;
  serviceId: number;
  startAt: string;
  onBooked: (appointment: BookedAppointment) => void;
  onSlotTaken: () => void;
};

/** Mensajes para errores que el servidor puede devolver aunque el formulario sea válido. */
function serverErrorMessage(status: number, message?: string): string {
  if (status === 429) return "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.";
  if (status >= 500 || !message) return "No pudimos confirmar el turno. Probá de nuevo en unos segundos.";
  return message;
}

export function BookingForm({ slug, serviceId, startAt, onBooked, onSlotTaken }: BookingFormProps) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { customerName: "", customerContact: "", website: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: FormOutput) {
    try {
      const res = await fetch(`/api/businesses/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, startAt, ...values }),
      });
      const body = await res.json().catch(() => null);

      if (res.status === 201) return onBooked(body.appointment);
      if (res.status === 409) return onSlotTaken();
      form.setError("root", { message: serverErrorMessage(res.status, body?.error?.message) });
    } catch {
      form.setError("root", { message: "Error de conexión. Revisá tu internet y probá de nuevo." });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.customerName)}>
          <FieldLabel htmlFor="customerName">Nombre y apellido</FieldLabel>
          <Input
            id="customerName"
            autoComplete="name"
            aria-invalid={Boolean(errors.customerName)}
            {...form.register("customerName")}
          />
          <FieldError errors={[errors.customerName]} />
        </Field>

        <Field data-invalid={Boolean(errors.customerContact)}>
          <FieldLabel htmlFor="customerContact">Email o teléfono</FieldLabel>
          <Input
            id="customerContact"
            autoComplete="email"
            placeholder="tu@email.com o +5491123456789"
            aria-invalid={Boolean(errors.customerContact)}
            aria-describedby="customerContact-help"
            {...form.register("customerContact")}
          />
          <FieldDescription id="customerContact-help">
            El teléfono va con código de país, por ejemplo +54 9 11 2345 6789.
          </FieldDescription>
          <FieldError errors={[errors.customerContact]} />
        </Field>

        {/* Honeypot antispam: invisible para personas, los bots suelen completarlo. */}
        <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
          <label htmlFor="website">No completar</label>
          <input id="website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
        </div>
      </FieldGroup>

      {errors.root && <FieldError>{errors.root.message}</FieldError>}

      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Confirmando…" : "Confirmar turno"}
      </Button>
    </form>
  );
}
