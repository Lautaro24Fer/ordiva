/**
 * Datos ficticios de la demo: los usa el seed de PostgreSQL (`prisma/seed.ts`)
 * y el modo demo sin base de datos (`lib/demo/store.ts`). Sin dependencias de
 * servidor: se importa también desde el navegador.
 */
import { DateTime } from "luxon";
import { localDateTimeToUtc } from "@/lib/time";

/** Contraseña de las cuentas demo; solo para entornos de desarrollo/demo. */
export const DEMO_PASSWORD = "demo-password-123";

export type SeedHours = { dayOfWeek: number; startTime: string; endTime: string }[];

export type SeedBusiness = {
  owner: { name: string; email: string };
  business: { name: string; slug: string; description: string; timezone: string };
  rule: { slotIntervalMinutes: number; minNoticeMinutes: number; maxAdvanceDays: number };
  services: { name: string; description: string; durationMinutes: number; price: string }[];
  hours: SeedHours;
  appointments: { serviceName: string; daysAhead: number; time: string; customerName: string; customerContact: string }[];
};

// Lunes a viernes con corte de mediodía; sábado solo mañana.
const weekdaysWithBreak = (morning: [string, string], afternoon: [string, string]): SeedHours =>
  [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
    { dayOfWeek, startTime: morning[0], endTime: morning[1] },
    { dayOfWeek, startTime: afternoon[0], endTime: afternoon[1] },
  ]);

export const SEED_DATA: SeedBusiness[] = [
  {
    owner: { name: "Ana Propietaria", email: "ana@example.com" },
    business: {
      name: "Barbería Centro",
      slug: "barberia-centro",
      description: "Cortes clásicos y modernos en el centro.",
      timezone: "America/Argentina/Buenos_Aires",
    },
    rule: { slotIntervalMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 30 },
    services: [
      { name: "Corte de pelo", description: "Corte con tijera o máquina.", durationMinutes: 30, price: "12000.00" },
      { name: "Corte + barba", description: "Corte completo y perfilado de barba.", durationMinutes: 45, price: "18000.00" },
      { name: "Afeitado clásico", description: "Afeitado con navaja y toalla caliente.", durationMinutes: 30, price: "9000.00" },
    ],
    hours: [
      ...weekdaysWithBreak(["09:00", "13:00"], ["15:00", "20:00"]),
      { dayOfWeek: 6, startTime: "09:00", endTime: "14:00" },
    ],
    appointments: [
      { serviceName: "Corte de pelo", daysAhead: 2, time: "10:00", customerName: "Cliente Ejemplo", customerContact: "cliente1@example.com" },
      { serviceName: "Corte + barba", daysAhead: 3, time: "16:00", customerName: "Otro Cliente", customerContact: "+5491100000001" },
    ],
  },
  {
    owner: { name: "Bruno Propietario", email: "bruno@example.com" },
    business: {
      name: "Estética Norte",
      slug: "estetica-norte",
      description: "Tratamientos faciales y manicuría.",
      timezone: "America/Argentina/Buenos_Aires",
    },
    rule: { slotIntervalMinutes: 30, minNoticeMinutes: 120, maxAdvanceDays: 45 },
    services: [
      { name: "Limpieza facial", description: "Limpieza profunda.", durationMinutes: 60, price: "25000.00" },
      { name: "Manicuría", description: "Manicuría tradicional.", durationMinutes: 45, price: "15000.00" },
    ],
    hours: weekdaysWithBreak(["10:00", "13:00"], ["14:00", "19:00"]),
    appointments: [
      { serviceName: "Limpieza facial", daysAhead: 2, time: "10:00", customerName: "Clienta Ejemplo", customerContact: "clienta@example.com" },
    ],
  },
];

/** Próxima fecha local (>= daysAhead) que cae en lunes..viernes. */
export function nextWeekdayLocalDate(daysAhead: number, zone: string, now: Date): string {
  let dt = DateTime.fromJSDate(now, { zone }).startOf("day").plus({ days: daysAhead });
  while (dt.weekday > 5) dt = dt.plus({ days: 1 });
  return dt.toISODate()!;
}

/** Instante de inicio de un turno sembrado (próximo día hábil, hora local del negocio). */
export function seedAppointmentStart(
  appt: Pick<SeedBusiness["appointments"][number], "daysAhead" | "time">,
  zone: string,
  now: Date,
): Date {
  const localDate = nextWeekdayLocalDate(appt.daysAhead, zone, now);
  const startAt = localDateTimeToUtc(localDate, appt.time, zone);
  if (!startAt) throw new Error(`Hora local inválida en seed: ${localDate} ${appt.time}`);
  return startAt;
}
