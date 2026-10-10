import Link from "next/link";
import { Suspense } from "react";
import { LayoutDashboard } from "lucide-react";
import { Brand } from "@/components/public/brand";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUserId } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Header de las páginas públicas. Es discreto a propósito: en la página de un
 * negocio el protagonista es "Reservar", así que acá no hay botones primarios.
 */
export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Brand />
        <nav aria-label="Cuenta">
          {/* La sesión se lee en request time: el resto del header queda estático. */}
          <Suspense fallback={<Skeleton className="h-9 w-24 sm:w-60" />}>
            <AccountLinks />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function AccountLinks() {
  if ((await getSessionUserId()) !== null) {
    return (
      <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg" })}>
        <LayoutDashboard aria-hidden />
        Ir a mi panel
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
        Ingresar
      </Link>
      <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "hidden sm:inline-flex")}>
        Registrá tu negocio
      </Link>
    </div>
  );
}
