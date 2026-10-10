"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

type Props = { businessId: number; appointmentId: number; summary: string };

/** Acciones sobre un turno confirmado: completar o cancelar (nunca se borra). */
export function AppointmentActions({ businessId, appointmentId, summary }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function update(status: "CANCELLED" | "COMPLETED") {
    if (status === "CANCELLED" && !window.confirm(`¿Cancelar el turno de ${summary}? El horario vuelve a quedar libre.`)) {
      return;
    }
    startTransition(async () => {
      const result = await apiRequest(
        `/api/admin/businesses/${businessId}/appointments/${appointmentId}`,
        "PATCH",
        { status },
      );
      if (!result.ok) return setError(result.message);
      setError(undefined);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => update("COMPLETED")}>
          Completar
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => update("CANCELLED")}>
          Cancelar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
