import Link from "next/link";
import { PageShell } from "@/components/public/page-shell";
import { buttonVariants } from "@/components/ui/button";

export default function BusinessNotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Negocio no encontrado</h1>
        <p className="text-muted-foreground">Revisá que la dirección esté bien escrita.</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Ir al inicio
        </Link>
      </div>
    </PageShell>
  );
}
