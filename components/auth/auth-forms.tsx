"use client";

import Link from "next/link";
import { useActionState } from "react";
import { demoLoginAction, loginAction, registerAction, type AuthFormState } from "@/app/(auth)/actions";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IS_DEMO } from "@/lib/demo/flag";
import { DEMO_ACCOUNTS } from "@/lib/demo/seed-data";
import { PASSWORD_MIN_LENGTH } from "@/schemas/auth";

const toErrors = (messages?: string[]) => messages?.map((message) => ({ message }));

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ingresar</CardTitle>
        <CardDescription>Panel para dueños de negocios.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className="h-9" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <PasswordInput id="password" name="password" autoComplete="current-password" required />
            </Field>
          </FieldGroup>
          {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        </CardContent>
        <CardFooter className="mt-4 flex flex-col items-stretch gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Ingresando…" : "Ingresar"}
          </Button>
          {!IS_DEMO && (
            <p className="text-center text-sm text-muted-foreground">
              ¿No tenés cuenta?{" "}
              <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
                Creala acá
              </Link>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

/** Demo: ingreso en un clic con las cuentas sembradas (sin contraseña a la vista). */
export function DemoAccounts({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(demoLoginAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Probá el panel</CardTitle>
        <CardDescription>
          Entrá como dueño de un negocio de ejemplo. Los cambios se guardan solo en este navegador.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-3">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              type="submit"
              name="email"
              value={account.email}
              size="lg"
              variant="outline"
              disabled={pending}
              className="h-auto flex-col items-start gap-0.5 py-2.5 text-left"
            >
              <span>Entrar como {account.name.split(" ")[0]}</span>
              <span className="text-xs font-normal text-muted-foreground">{account.businessName}</span>
            </Button>
          ))}
          {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        </CardContent>
      </form>
    </Card>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>Registrá tu negocio y empezá a recibir reservas.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="name">Tu nombre</FieldLabel>
              <Input id="name" name="name" autoComplete="name" required defaultValue={state.values?.name} aria-invalid={Boolean(errors.name)} className="h-9" />
              <FieldError errors={toErrors(errors.name)} />
            </Field>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} aria-invalid={Boolean(errors.email)} className="h-9" />
              <FieldError errors={toErrors(errors.email)} />
            </Field>
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                aria-invalid={Boolean(errors.password)}
              />
              <FieldDescription>Mínimo {PASSWORD_MIN_LENGTH} caracteres.</FieldDescription>
              <FieldError errors={toErrors(errors.password)} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-4 flex flex-col items-stretch gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Ingresá
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
