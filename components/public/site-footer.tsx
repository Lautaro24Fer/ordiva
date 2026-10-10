import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Turnos · Demo con datos ficticios</p>
        <p>
          ¿Tenés un negocio?{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Creá tu cuenta
          </Link>
        </p>
      </div>
    </footer>
  );
}
