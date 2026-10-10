import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";

/** Si ya hay sesión, login/registro no tienen sentido: ir al panel. Va dentro de <Suspense>. */
export async function RedirectIfAuthenticated() {
  if ((await getSessionUserId()) !== null) redirect("/dashboard");
  return null;
}
