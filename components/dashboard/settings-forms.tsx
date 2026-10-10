"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { TIMEZONE_OPTIONS } from "@/lib/timezones";
import { bookingRuleSchema } from "@/schemas/businesses";
import { optionalTextSchema, timezoneSchema } from "@/schemas/common";

// Mismo contrato que updateBusinessSchema, pero con todos los campos presentes.
const businessDetailsSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: optionalTextSchema(2000),
  timezone: timezoneSchema,
});

type Details = { name: string; description: string | null; timezone: string };

export function BusinessDetailsForm({ businessId, details }: { businessId: number; details: Details }) {
  const router = useRouter();
  const form = useForm<z.input<typeof businessDetailsSchema>, unknown, z.output<typeof businessDetailsSchema>>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: { ...details, description: details.description ?? "" },
  });
  const { errors, isSubmitting } = form.formState;
  // Permite conservar una zona válida que no esté en la lista sugerida.
  const options = TIMEZONE_OPTIONS.some((tz) => tz.value === details.timezone)
    ? TIMEZONE_OPTIONS
    : [{ value: details.timezone, label: details.timezone }, ...TIMEZONE_OPTIONS];

  async function onSubmit(values: z.output<typeof businessDetailsSchema>) {
    const result = await apiRequest(`/api/admin/businesses/${businessId}`, "PATCH", values);
    if (!result.ok) return form.setError("root", { message: result.message });
    toast.success("Datos del negocio guardados.");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Nombre</FieldLabel>
          <Input id="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Descripción</FieldLabel>
          <Textarea id="description" rows={3} {...form.register("description")} />
          <FieldError errors={[errors.description]} />
        </Field>
        <Field data-invalid={Boolean(errors.timezone)}>
          <FieldLabel htmlFor="timezone">Zona horaria</FieldLabel>
          <NativeSelect id="timezone" {...form.register("timezone")}>
            {options.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            Cambiarla mueve la interpretación de tus horarios de atención. Los turnos ya reservados no cambian.
          </FieldDescription>
          <FieldError errors={[errors.timezone]} />
        </Field>
      </FieldGroup>
      {errors.root && <FieldError>{errors.root.message}</FieldError>}
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Guardando…" : "Guardar datos"}
      </Button>
    </form>
  );
}

type Rule = z.input<typeof bookingRuleSchema>;

export function BookingRuleForm({ businessId, rule }: { businessId: number; rule: Rule }) {
  const router = useRouter();
  const form = useForm<Rule, unknown, z.output<typeof bookingRuleSchema>>({
    resolver: zodResolver(bookingRuleSchema),
    defaultValues: rule,
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: z.output<typeof bookingRuleSchema>) {
    const result = await apiRequest(`/api/admin/businesses/${businessId}/booking-rule`, "PUT", values);
    if (!result.ok) return form.setError("root", { message: result.message });
    toast.success("Reglas de reserva guardadas.");
    router.refresh();
  }

  const numberField = (name: keyof Rule, label: string, description: string, props: React.ComponentProps<"input">) => (
    <Field data-invalid={Boolean(errors[name])}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        type="number"
        inputMode="numeric"
        aria-invalid={Boolean(errors[name])}
        {...props}
        {...form.register(name, { valueAsNumber: true })}
      />
      <FieldDescription>{description}</FieldDescription>
      <FieldError errors={[errors[name]]} />
    </Field>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        {numberField("slotIntervalMinutes", "Intervalo entre turnos (minutos)", "Cada cuánto empieza un turno posible: 09:00, 09:15, 09:30…", { min: 5, step: 5 })}
        {numberField("minNoticeMinutes", "Anticipación mínima (minutos)", "Con cuánta anticipación hay que reservar.", { min: 0, step: 15 })}
        {numberField("maxAdvanceDays", "Reservas hasta (días)", "Cuántos días hacia adelante se puede reservar, contando hoy.", { min: 1 })}
      </FieldGroup>
      {errors.root && <FieldError>{errors.root.message}</FieldError>}
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Guardando…" : "Guardar reglas"}
      </Button>
    </form>
  );
}
