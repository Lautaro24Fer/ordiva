import Link from "next/link";

/** Contenedor común de las páginas públicas: columna centrada y legible en móvil. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-8 text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          Plataforma de turnos
        </Link>{" "}
        · Demo con datos ficticios
      </footer>
    </div>
  );
}
