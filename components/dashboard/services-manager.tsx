"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceForm, type AdminService } from "@/components/dashboard/service-form";
import { apiRequest } from "@/lib/api-client";
import { formatDuration, formatPrice } from "@/lib/format-display";
import { cn } from "@/lib/utils";

export function ServicesManager({ businessId, services }: { businessId: number; services: AdminService[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function refresh(message: string) {
    toast.success(message);
    setEditingId(undefined);
    router.refresh();
  }

  function toggleActive(service: AdminService) {
    startTransition(async () => {
      const url = `/api/admin/businesses/${businessId}/services/${service.id}`;
      // DELETE desactiva (borrado lógico); reactivar es un PATCH.
      const result = service.isActive
        ? await apiRequest(url, "DELETE")
        : await apiRequest(url, "PATCH", { isActive: true });
      if (!result.ok) return setError(result.message);
      setError(undefined);
      toast.success(
        service.isActive
          ? `"${service.name}" desactivado: ya no aparece para reservar.`
          : `"${service.name}" activado: ya se puede reservar.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">
          Todavía no cargaste servicios. Agregá el primero abajo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {services.map((service) => (
            <li key={service.id} className={cn("rounded-xl border bg-card p-4", !service.isActive && "opacity-70")}>
              {editingId === service.id ? (
                <ServiceForm
                  businessId={businessId}
                  service={service}
                  onSaved={() => refresh("Servicio actualizado.")}
                  onCancel={() => setEditingId(undefined)}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      {service.name}
                      {!service.isActive && <Badge variant="outline">Inactivo</Badge>}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(service.id)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggleActive(service)}>
                      {service.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nuevo servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm businessId={businessId} onSaved={() => refresh("Servicio agregado.")} />
        </CardContent>
      </Card>
    </div>
  );
}
