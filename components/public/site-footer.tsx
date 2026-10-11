import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUserId } from "@/lib/session";

const footerLink = "font-medium text-foreground underline-offset-4 hover:underline";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Ordiva · Demo con datos ficticios</p>
        <Suspense fallback={<Skeleton className="h-5 w-56" />}>
          <OwnerLink />
        </Suspense>
      </div>
    </footer>
  );
}

async function OwnerLink() {
  if ((await getSessionUserId()) !== null) {
    return (
      <p>
        <Link href="/dashboard" className={footerLink}>
          Ir a mi panel
        </Link>
      </p>
    );
  }
  return (
    <p>
      ¿Tenés un negocio?{" "}
      <Link href="/register" className={footerLink}>
        Creá tu cuenta
      </Link>
    </p>
  );
}
