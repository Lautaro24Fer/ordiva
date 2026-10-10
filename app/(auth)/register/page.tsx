import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <>
      <Suspense>
        <RedirectIfAuthenticated />
      </Suspense>
      <RegisterForm />
    </>
  );
}
