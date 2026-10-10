import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";
import { Skeleton } from "@/components/ui/skeleton";
import { safeInternalPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
      <RedirectIfAuthenticated />
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={safeInternalPath(callbackUrl)} />;
}
