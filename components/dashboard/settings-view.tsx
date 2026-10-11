import { BookingRuleForm, BusinessDetailsForm } from "@/components/dashboard/settings-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingRuleData, PublicBusinessRow } from "@/modules/repositories";

type Props = { business: PublicBusinessRow & { id: number }; rule: BookingRuleData };

/** Datos del negocio y reglas de reserva. */
export function SettingsView({ business, rule }: Props) {
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
