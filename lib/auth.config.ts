import type { NextAuthConfig } from "next-auth";

/**
 * Configuración compartida y liviana (sin base de datos ni Argon2): la usa el
 * proxy para leer la sesión. Los providers se agregan en `lib/auth.ts`.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  // Credentials solo funciona con sesiones JWT (cookie firmada y cifrada, httpOnly).
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
} satisfies NextAuthConfig;
