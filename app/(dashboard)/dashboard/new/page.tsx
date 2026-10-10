import type { Metadata } from "next";
import { CreateBusinessForm } from "@/components/dashboard/business-form";

export const metadata: Metadata = { title: "Nuevo negocio" };

// La sesión la exigen el proxy (redirección) y la API al crear (401).
export default function NewBusinessPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo negocio</h1>
        <p className="text-muted-foreground">Después vas a poder cargar servicios y horarios.</p>
      </div>
      <CreateBusinessForm />
    </div>
  );
}
