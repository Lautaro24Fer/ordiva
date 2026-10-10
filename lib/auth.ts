import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { getClientIp } from "@/lib/http";
import { loginRateLimiter } from "@/lib/rate-limit";
import { verifyCredentials } from "@/modules/auth/auth.service";
import { loginSchema } from "@/schemas/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  logger: {
    // Credenciales incorrectas son un caso esperado: no ensuciar los logs.
    // Para el resto, solo nombre y tipo (nunca credenciales ni datos de sesión).
    error(error) {
      const type = (error as { type?: string }).type ?? error.name;
      if (type === "CredentialsSignin") return;
      console.error("[auth]", type);
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Frena fuerza bruta por IP + email (en memoria: ver lib/rate-limit.ts).
        const key = `${getClientIp(request)}:${parsed.data.email}`;
        if (!(await loginRateLimiter.consume(key))) return null;

        const user = await verifyCredentials(parsed.data);
        return user ? { id: String(user.id), name: user.name, email: user.email } : null;
      },
    }),
  ],
});
