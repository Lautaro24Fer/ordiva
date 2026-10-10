"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copia la URL absoluta de la página pública: es lo que el dueño comparte para recibir reservas. */
export function CopyLinkButton({ path }: { path: string }) {
  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado. Ya podés compartirlo.");
    } catch {
      toast.error(`No pudimos copiar el link. Copialo a mano: ${url}`);
    }
  }

  return (
    <Button variant="outline" onClick={copy}>
      <Copy aria-hidden />
      Copiar link
    </Button>
  );
}
