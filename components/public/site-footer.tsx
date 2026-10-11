import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { IS_DEMO } from "@/lib/demo/flag";
import { getSessionUserId } from "@/lib/session";

const footerLink = "font-medium text-foreground underline-offset-4 hover:underline";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{IS_DEMO ? "Ordiva · Demo con datos ficticios" : "Ordiva"}</p>
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
      <Link href={IS_DEMO ? "/login" : "/register"} className={footerLink}>
        {IS_DEMO ? "Probá el panel" : "Creá tu cuenta"}
      </Link>
    </p>
  );
}
