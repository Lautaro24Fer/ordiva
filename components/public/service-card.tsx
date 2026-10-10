import Link from "next/link";
import { Clock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatPrice } from "@/lib/format-display";
import type { PublicService } from "@/modules/businesses/public-pages.service";

export function ServiceCard({ service, bookingHref }: { service: PublicService; bookingHref: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{service.name}</CardTitle>
        {service.description && <CardDescription>{service.description}</CardDescription>}
        <CardAction className="text-base font-semibold tabular-nums">{formatPrice(service.price)}</CardAction>
      </CardHeader>
      <CardFooter className="justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock aria-hidden className="size-4" />
          {formatDuration(service.durationMinutes)}
        </span>
        <Link href={bookingHref} className={buttonVariants()}>
          Reservar
        </Link>
      </CardFooter>
    </Card>
  );
}
