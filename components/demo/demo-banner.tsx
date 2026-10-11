"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical } from "lucide-react";
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
import { resetDemo } from "@/lib/demo/store";

/** Aviso fijo del modo demo, con la opción de volver a los datos de ejemplo. */
export function DemoBanner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function reset() {
    resetDemo();
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="border-b bg-accent text-accent-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-sm">
        <p className="flex items-center gap-2">
          <FlaskConical aria-hidden className="size-4 shrink-0" />
          <span>
            <span className="font-medium">Demo:</span> los datos son ficticios y tus cambios se guardan solo en este
            navegador.
          </span>
        </p>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Reiniciar datos</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Reiniciar la demo?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borran las reservas y los cambios que hiciste en este navegador y vuelven los datos de ejemplo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction onClick={reset}>Sí, reiniciar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
