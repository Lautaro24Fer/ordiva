import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Instancia liviana (sin providers): solo valida la cookie de sesión.
const { auth } = NextAuth(authConfig);

/**
 * Chequeo optimista: sin sesión, /dashboard redirige al login. NO es la
 * autorización real: cada página y cada endpoint vuelven a verificar la
 * sesión y la pertenencia del negocio.
 */
export const proxy = auth((request) => {
  if (request.auth) return;
  const loginUrl = new URL("/login", request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
