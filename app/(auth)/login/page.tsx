import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoAccounts, LoginForm } from "@/components/auth/auth-forms";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";
import { Skeleton } from "@/components/ui/skeleton";
import { IS_DEMO } from "@/lib/demo/flag";
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
  const target = safeInternalPath(callbackUrl);
  if (!IS_DEMO) return <LoginForm callbackUrl={target} />;
  return (
    <>
      <DemoAccounts callbackUrl={target} />
      <LoginForm callbackUrl={target} />
    </>
  );
}
