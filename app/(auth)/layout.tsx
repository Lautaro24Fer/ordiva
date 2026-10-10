import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-6 text-sm font-medium text-muted-foreground hover:text-foreground">
        Plataforma de turnos
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
