import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingRuleForm, BusinessDetailsForm } from "@/components/dashboard/settings-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOwnedBusiness } from "@/lib/dashboard";
import { getBookingRule } from "@/modules/businesses/businesses.service";

export const metadata: Metadata = { title: "Configuración" };

type Props = PageProps<"/dashboard/[businessId]/settings">;

export default function SettingsPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <SettingsContent params={params} />
    </Suspense>
  );
}

async function SettingsContent({ params }: Pick<Props, "params">) {
  const { userId, business } = await loadOwnedBusiness((await params).businessId);
  const rule = await getBookingRule(userId, business.id);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
          <CardDescription>
            Dirección pública: <span className="font-medium text-foreground">/b/{business.slug}</span> (no se puede
            cambiar).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessDetailsForm
            businessId={business.id}
            details={{ name: business.name, description: business.description, timezone: business.timezone }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reglas de reserva</CardTitle>
          <CardDescription>Se aplican a las nuevas reservas desde la página pública.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingRuleForm businessId={business.id} rule={rule} />
        </CardContent>
      </Card>
    </div>
  );
}
