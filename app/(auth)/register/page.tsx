import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/app/(auth)/actions";
import { RegisterForm } from "@/components/auth/auth-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IS_DEMO } from "@/lib/demo/flag";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <RegisterContent />
    </Suspense>
  );
}

/**
 * Con sesión iniciada no redirigimos en silencio (parecía que "Crear cuenta"
 * no funcionaba): se explica y se ofrece salir para registrar otra cuenta.
 */
async function RegisterContent() {
  if (IS_DEMO) return <RegisterDisabled />;
  const session = await getSession();
  if (!session?.user) return <RegisterForm />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ya tenés una sesión iniciada</CardTitle>
        <CardDescription>
          Ingresaste como <span className="font-medium text-foreground">{session.user.email}</span>. Para crear otra
          cuenta primero tenés que salir de esta.
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-4 flex flex-col items-stretch gap-3">
        <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
          Ir a mi panel
        </Link>
        <form action={logoutAction}>
          <input type="hidden" name="redirectTo" value="/register" />
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Salir y crear otra cuenta
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

/** Demo sin base de datos: no hay alta de cuentas, se usan las cuentas de ejemplo. */
function RegisterDisabled() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Registro desactivado en la demo</CardTitle>
        <CardDescription>
          Esta es una demo sin base de datos. Para probar el panel, ingresá con una de las cuentas de ejemplo.
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-4 flex flex-col items-stretch gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Probar el panel
        </Link>
      </CardFooter>
    </Card>
  );
}
