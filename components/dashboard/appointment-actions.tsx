"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

type Props = { businessId: number; appointmentId: number; summary: string };

/** Acciones sobre un turno confirmado: completar o cancelar (nunca se borra). */
export function AppointmentActions({ businessId, appointmentId, summary }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(status: "CANCELLED" | "COMPLETED") {
    startTransition(async () => {
      const result = await apiRequest(
        `/api/admin/businesses/${businessId}/appointments/${appointmentId}`,
        "PATCH",
        { status },
      );
      setConfirmOpen(false);
      if (!result.ok) return setError(result.message);
      setError(undefined);
      toast.success(
        status === "CANCELLED"
          ? `Turno de ${summary} cancelado. El horario quedó libre.`
          : `Turno de ${summary} completado.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Button variant="outline" disabled={pending} className="max-sm:h-11" onClick={() => update("COMPLETED")}>
          Completar
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger render={<Button variant="destructive" disabled={pending} className="max-sm:h-11" />}>Cancelar</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar este turno?</AlertDialogTitle>
              <AlertDialogDescription>
                El turno de {summary} se cancela y el horario vuelve a quedar libre para otras reservas. No se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={pending} onClick={() => update("CANCELLED")}>
                {pending ? "Cancelando…" : "Sí, cancelar turno"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
