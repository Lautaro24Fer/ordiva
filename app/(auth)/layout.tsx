import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Brand } from "@/components/public/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-linear-to-b from-accent to-background">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:-my-3 max-sm:py-3"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Volver al inicio
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          {children}
          <p className="text-center text-sm text-muted-foreground">
            ¿Querés reservar un turno? No necesitás cuenta:{" "}
            <Link href="/#negocios" className="font-medium text-foreground underline-offset-4 hover:underline">
              elegí un negocio
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
