import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4">
          <Link href="/dashboard" className="font-semibold">
            Panel de turnos
          </Link>
          <Suspense fallback={<Skeleton className="h-8 w-32" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}

async function UserMenu() {
  const session = await getSession();
  if (!session?.user) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline">{session.user.email}</span>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm">
          <LogOut aria-hidden />
          Salir
        </Button>
      </form>
    </div>
  );
}
