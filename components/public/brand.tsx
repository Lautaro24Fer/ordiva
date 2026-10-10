import Link from "next/link";
import { CalendarCheck } from "lucide-react";

/** Marca de la plataforma: siempre lleva al inicio. */
export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarCheck aria-hidden className="size-4.5" />
      </span>
      Turnos
    </Link>
  );
}
