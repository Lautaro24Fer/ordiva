import type { AppointmentStatus, BookingRuleData, HoursRow } from "@/modules/repositories";
import { SEED_DATA, seedAppointmentStart } from "@/lib/demo/seed-data";

/**
 * Estado del modo demo: un snapshot normalizado que vive en el localStorage
 * de cada visitante. Si localStorage no está disponible (navegación privada
 * estricta, tests en Node) se mantiene solo en memoria.
 *
 * Cada actualización reemplaza el objeto de estado (nunca se muta el actual):
 * así `useSyncExternalStore` detecta el cambio por identidad.
 */

const STORAGE_KEY = "ordiva-demo:v1";
const STATE_VERSION = 1;
/** Pasado este tiempo se vuelve a sembrar, para que los turnos de ejemplo sigan siendo futuros. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type DemoBusiness = {
  id: number;
  ownerId: number;
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
  createdAt: string;
};

export type DemoService = {
  id: number;
  businessId: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  isActive: boolean;
};

export type DemoAppointment = {
  id: number;
  businessId: number;
  serviceId: number;
  customerName: string;
  customerContact: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  serviceDurationMinutes: number;
  servicePrice: string;
};

export type DemoState = {
  version: typeof STATE_VERSION;
  seededAt: string;
  users: { id: number; name: string; email: string }[];
  businesses: DemoBusiness[];
  rules: (BookingRuleData & { businessId: number })[];
  hours: (HoursRow & { businessId: number })[];
  services: DemoService[];
  appointments: DemoAppointment[];
  nextIds: { user: number; business: number; service: number; appointment: number };
};

/** Estado inicial a partir de `SEED_DATA`, con turnos relativos a `now`. */
export function createSeedState(now: Date = new Date()): DemoState {
  const state: DemoState = {
    version: STATE_VERSION,
    seededAt: now.toISOString(),
    users: [],
    businesses: [],
    rules: [],
    hours: [],
    services: [],
    appointments: [],
    nextIds: { user: 1, business: 1, service: 1, appointment: 1 },
  };

  for (const data of SEED_DATA) {
    const ownerId = state.nextIds.user++;
    state.users.push({ id: ownerId, ...data.owner });

    const businessId = state.nextIds.business++;
    state.businesses.push({ id: businessId, ownerId, ...data.business, createdAt: now.toISOString() });
    state.rules.push({ businessId, ...data.rule });
    state.hours.push(...data.hours.map((h) => ({ businessId, ...h })));

    const serviceIds = new Map<string, number>();
    for (const service of data.services) {
      const id = state.nextIds.service++;
      serviceIds.set(service.name, id);
      state.services.push({ id, businessId, ...service, isActive: true });
    }

    for (const appt of data.appointments) {
      const service = data.services.find((s) => s.name === appt.serviceName)!;
      const startAt = seedAppointmentStart(appt, data.business.timezone, now);
      state.appointments.push({
        id: state.nextIds.appointment++,
        businessId,
        serviceId: serviceIds.get(appt.serviceName)!,
        customerName: appt.customerName,
        customerContact: appt.customerContact,
        startAt: startAt.toISOString(),
        endAt: new Date(startAt.getTime() + service.durationMinutes * 60_000).toISOString(),
        status: "CONFIRMED",
        serviceDurationMinutes: service.durationMinutes,
        servicePrice: service.price,
      });
    }
  }
  return state;
}

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isFresh(value: unknown, now: Date): value is DemoState {
  const state = value as DemoState | null;
  return (
    state?.version === STATE_VERSION &&
    typeof state.seededAt === "string" &&
    now.getTime() - Date.parse(state.seededAt) < MAX_AGE_MS
  );
}

function load(now: Date): DemoState {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isFresh(parsed, now)) return parsed;
  } catch {
    // JSON corrupto o storage bloqueado: se vuelve a sembrar.
  }
  return persist(createSeedState(now));
}

function persist(state: DemoState): DemoState {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Cuota llena o storage bloqueado: el estado sigue en memoria.
  }
  return state;
}

let current: DemoState | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getDemoState(): DemoState {
  current ??= load(new Date());
  return current;
}

/** Aplica `recipe` sobre una copia del estado, la guarda y notifica. */
export function updateDemoState<T>(recipe: (draft: DemoState) => T): T {
  const draft = structuredClone(getDemoState());
  const result = recipe(draft);
  current = persist(draft);
  notify();
  return result;
}

/** Vuelve a los datos de prueba originales. */
export function resetDemo(now: Date = new Date()): void {
  current = persist(createSeedState(now));
  notify();
}

export function subscribeDemoState(listener: () => void): () => void {
  listeners.add(listener);

  // Otra pestaña cambió los datos: se recargan desde storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    current = null;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
