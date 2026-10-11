/**
 * Contratos de acceso a datos. Los servicios de `modules/` dependen solo de
 * estas interfaces, así la misma lógica corre contra PostgreSQL (Prisma, en el
 * servidor) o contra localStorage (modo demo, en el navegador).
 *
 * Convenciones: importes como string decimal ("12000.00"), instantes como
 * `Date`. Las violaciones de restricciones se informan con
 * `ConstraintViolation`; el mensaje para el cliente lo decide el servicio.
 */

export type AppointmentStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type BookingRuleData = {
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
};

export type HoursRow = { dayOfWeek: number; startTime: string; endTime: string };

export type PublicBusinessRow = {
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
};

export type OwnedBusinessRow = PublicBusinessRow & { id: number; createdAt: Date };

export type ServiceRow = {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  isActive: boolean;
};

export type AdminAppointmentRow = {
  id: number;
  customerName: string;
  customerContact: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  serviceDurationMinutes: number;
  servicePrice: string;
  service: { id: number; name: string };
};

export type UserRow = { id: number; name: string; email: string };

/** Restricción de integridad violada (unicidad o solapamiento de turnos). */
export class ConstraintViolation extends Error {
  constructor(readonly kind: "unique" | "overlap") {
    super(`Constraint violation: ${kind}`);
    this.name = "ConstraintViolation";
  }
}

export interface BusinessRepository {
  findBySlug(slug: string): Promise<(PublicBusinessRow & { id: number }) | null>;
  /** Negocio con su regla y servicios activos (orden por nombre), para las páginas públicas. */
  findPublicPage(slug: string): Promise<
    | (PublicBusinessRow & {
        id: number;
        bookingRule: BookingRuleData | null;
        services: Omit<ServiceRow, "isActive">[];
      })
    | null
  >;
  /** Negocios con al menos un servicio activo, por nombre. */
  listWithActiveServices(limit: number): Promise<Pick<PublicBusinessRow, "name" | "slug" | "description">[]>;
  findOwned(userId: number, businessId: number): Promise<OwnedBusinessRow | null>;
  listOwned(userId: number): Promise<OwnedBusinessRow[]>;
  /** Crea el negocio y su regla; slug repetido → `ConstraintViolation("unique")`. */
  create(
    userId: number,
    data: PublicBusinessRow,
    rule: BookingRuleData,
  ): Promise<OwnedBusinessRow>;
  /** `false` si el negocio no existe o no es del usuario. */
  update(userId: number, businessId: number, data: Partial<PublicBusinessRow>): Promise<boolean>;
}

export interface BookingRuleRepository {
  find(businessId: number): Promise<BookingRuleData | null>;
  upsert(businessId: number, data: BookingRuleData): Promise<BookingRuleData>;
}

export interface HoursRepository {
  /** Franjas del negocio (de un día si se indica), por día y hora de inicio. */
  list(businessId: number, dayOfWeek?: number): Promise<HoursRow[]>;
  /** Días de la semana con al menos una franja. */
  openDays(businessId: number): Promise<number[]>;
  /** Reemplazo atómico; `null` si el negocio no existe o no es del usuario. */
  replace(userId: number, businessId: number, hours: HoursRow[]): Promise<HoursRow[] | null>;
}

export interface ServiceRepository {
  /** Servicios del negocio: activos primero y luego por nombre, o solo activos. */
  list(businessId: number, options: { activeOnly: boolean }): Promise<ServiceRow[]>;
  findActive(businessId: number, serviceId: number): Promise<ServiceRow | null>;
  create(businessId: number, data: Omit<ServiceRow, "id" | "isActive"> & { isActive?: boolean }): Promise<ServiceRow>;
  /** `null` si el servicio no existe, es de otro negocio o el negocio no es del usuario. */
  update(
    userId: number,
    businessId: number,
    serviceId: number,
    data: Partial<Omit<ServiceRow, "id">>,
  ): Promise<ServiceRow | null>;
}

export type NewAppointment = {
  businessId: number;
  serviceId: number;
  customerName: string;
  customerContact: string;
  startAt: Date;
  endAt: Date;
  serviceDurationMinutes: number;
  servicePrice: string;
};

export interface AppointmentRepository {
  /** Turnos con estado en `statuses` que se cruzan con [from, to). */
  findOverlapping(
    businessId: number,
    from: Date,
    to: Date,
    statuses: readonly AppointmentStatus[],
  ): Promise<{ startAt: Date; endAt: Date }[]>;
  /** Crea un turno CONFIRMED; si se superpone con otro activo → `ConstraintViolation("overlap")`. */
  create(data: NewAppointment): Promise<{ id: number; startAt: Date; endAt: Date; status: AppointmentStatus }>;
  listInRange(businessId: number, from: Date, to: Date): Promise<AdminAppointmentRow[]>;
  /**
   * Cambia el estado solo si el turno está CONFIRMED (en una sola operación).
   * Devuelve el turno resultante (o `null` si no existe / no es del usuario) y
   * si el cambio se aplicó.
   */
  transitionFromConfirmed(
    userId: number,
    businessId: number,
    appointmentId: number,
    status: "CANCELLED" | "COMPLETED",
  ): Promise<{ appointment: AdminAppointmentRow | null; applied: boolean }>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<(UserRow & { passwordHash: string | null }) | null>;
  /** Email repetido → `ConstraintViolation("unique")`. */
  create(data: { name: string; email: string; passwordHash: string }): Promise<UserRow>;
}

export type Repositories = {
  businesses: BusinessRepository;
  bookingRules: BookingRuleRepository;
  hours: HoursRepository;
  services: ServiceRepository;
  appointments: AppointmentRepository;
  users: UserRepository;
};
