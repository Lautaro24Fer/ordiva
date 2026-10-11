import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/public/brand";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Brand />
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Panel</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="h-9 w-10 sm:w-56" />}>
              <AccountMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <Toaster position="top-center" />
    </div>
  );
}

async function AccountMenu() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  return <UserMenu email={session.user.email} />;
}
