"use client";

import { PageShell } from "@/components/public/page-shell";
import { Button } from "@/components/ui/button";

/** Error inesperado al renderizar: mensaje genérico, sin detalles internos. */
export default function BusinessError({ retry }: { retry: () => void }) {
  return (
    <PageShell>
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Algo salió mal</h1>
        <p className="text-muted-foreground">No pudimos cargar esta página. Probá de nuevo en unos segundos.</p>
        <Button variant="outline" onClick={() => retry()}>
          Reintentar
        </Button>
      </div>
    </PageShell>
  );
}
