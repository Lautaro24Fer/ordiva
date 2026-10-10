"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { createServiceSchema } from "@/schemas/services";

type FormInput = z.input<typeof createServiceSchema>;
type FormOutput = z.output<typeof createServiceSchema>;

export type AdminService = {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  isActive: boolean;
};

type Props = {
  businessId: number;
  /** Si viene, edita ese servicio; si no, crea uno nuevo. */
  service?: AdminService;
  onSaved: () => void;
  onCancel?: () => void;
};

export function ServiceForm({ businessId, service, onSaved, onCancel }: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      durationMinutes: service?.durationMinutes ?? 30,
      price: service?.price ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const idPrefix = service ? `service-${service.id}` : "new-service";

  async function onSubmit(values: FormOutput) {
    const base = `/api/admin/businesses/${businessId}/services`;
    const result = service
      ? await apiRequest(`${base}/${service.id}`, "PATCH", values)
      : await apiRequest(base, "POST", values);
    if (!result.ok) return form.setError("root", { message: result.message });
    if (!service) form.reset();
    onSaved();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.name)} className="sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-name`}>Nombre</FieldLabel>
          <Input id={`${idPrefix}-name`} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.durationMinutes)}>
          <FieldLabel htmlFor={`${idPrefix}-duration`}>Duración (minutos)</FieldLabel>
          <Input
            id={`${idPrefix}-duration`}
            type="number"
            inputMode="numeric"
            min={5}
            step={5}
            aria-invalid={Boolean(errors.durationMinutes)}
            {...form.register("durationMinutes", { valueAsNumber: true })}
          />
          <FieldError errors={[errors.durationMinutes]} />
        </Field>
        <Field data-invalid={Boolean(errors.price)}>
          <FieldLabel htmlFor={`${idPrefix}-price`}>Precio (ARS)</FieldLabel>
          <Input
            id={`${idPrefix}-price`}
            inputMode="decimal"
            placeholder="12000"
            aria-invalid={Boolean(errors.price)}
            {...form.register("price")}
          />
          <FieldError errors={[errors.price]} />
        </Field>
        <Field data-invalid={Boolean(errors.description)} className="sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-description`}>Descripción (opcional)</FieldLabel>
          <Textarea id={`${idPrefix}-description`} rows={2} {...form.register("description")} />
          <FieldError errors={[errors.description]} />
        </Field>
      </FieldGroup>
      {errors.root && <FieldError>{errors.root.message}</FieldError>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : service ? "Guardar cambios" : "Agregar servicio"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
