"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { TIMEZONE_OPTIONS, slugify } from "@/lib/timezones";
import { createBusinessSchema } from "@/schemas/businesses";

type FormInput = z.input<typeof createBusinessSchema>;
type FormOutput = z.output<typeof createBusinessSchema>;

/** Alta de negocio: crea el negocio (y su regla de reserva por defecto) y abre su panel. */
export function CreateBusinessForm() {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(false);
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: { name: "", slug: "", description: "", timezone: TIMEZONE_OPTIONS[0].value },
  });
  const { errors, isSubmitting } = form.formState;
  const slug = useWatch({ control: form.control, name: "slug" });

  async function onSubmit(values: FormOutput) {
    const result = await apiRequest<{ business: { id: number } }>("/api/admin/businesses", "POST", values);
    if (!result.ok) {
      if (result.status === 409) return form.setError("slug", { message: result.message });
      return form.setError("root", { message: result.message });
    }
    router.push(`/dashboard/${result.data.business.id}/services`);
    router.refresh();
  }

  const nameField = form.register("name", {
    onChange: (event) => {
      if (!slugEdited) form.setValue("slug", slugify(event.target.value));
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Nombre del negocio</FieldLabel>
          <Input id="name" aria-invalid={Boolean(errors.name)} {...nameField} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.slug)}>
          <FieldLabel htmlFor="slug">Dirección pública</FieldLabel>
          <Input
            id="slug"
            aria-invalid={Boolean(errors.slug)}
            {...form.register("slug", { onChange: () => setSlugEdited(true) })}
          />
          <FieldDescription>
            Tus clientes reservan en <span className="font-medium text-foreground">/b/{slug || "tu-negocio"}</span>.
            Solo minúsculas, números y guiones. No se puede cambiar después.
          </FieldDescription>
          <FieldError errors={[errors.slug]} />
        </Field>
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Descripción (opcional)</FieldLabel>
          <Textarea id="description" rows={3} {...form.register("description")} />
          <FieldError errors={[errors.description]} />
        </Field>
        <Field data-invalid={Boolean(errors.timezone)}>
          <FieldLabel htmlFor="timezone">Zona horaria</FieldLabel>
          <NativeSelect id="timezone" {...form.register("timezone")}>
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>Los horarios de atención se interpretan en esta zona.</FieldDescription>
          <FieldError errors={[errors.timezone]} />
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Creando…" : "Crear negocio"}
      </Button>
    </form>
  );
}
