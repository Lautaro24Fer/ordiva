import { getDemoState, updateDemoState, type DemoAppointment, type DemoBusiness, type DemoService } from "@/lib/demo/store";
import { ConstraintViolation, type AdminAppointmentRow, type Repositories, type ServiceRow } from "@/modules/repositories";

/**
 * Repositorios del modo demo sobre el store de localStorage. Emulan las
 * restricciones que en PostgreSQL pone la base: slug y email únicos, y no
 * superposición de turnos CONFIRMED/COMPLETED del mismo negocio. Corren en un
 * único navegador, así que no hay concurrencia que serializar.
 */

const BLOCKING: readonly string[] = ["CONFIRMED", "COMPLETED"];

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");
const byHours = (a: { dayOfWeek: number; startTime: string }, b: { dayOfWeek: number; startTime: string }) =>
  a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime);

const toPublicBusiness = ({ name, slug, description, timezone }: DemoBusiness) => ({
  name,
  slug,
  description,
  timezone,
});

const toOwnedBusiness = (b: DemoBusiness) => ({ id: b.id, ...toPublicBusiness(b), createdAt: new Date(b.createdAt) });

const toService = ({ id, name, description, durationMinutes, price, isActive }: DemoService): ServiceRow => ({
  id,
  name,
  description,
  durationMinutes,
  price,
  isActive,
});

function toAdminAppointment(a: DemoAppointment, services: DemoService[]): AdminAppointmentRow {
  const service = services.find((s) => s.id === a.serviceId);
  return {
    id: a.id,
    customerName: a.customerName,
    customerContact: a.customerContact,
    startAt: new Date(a.startAt),
    endAt: new Date(a.endAt),
    status: a.status,
    serviceDurationMinutes: a.serviceDurationMinutes,
    servicePrice: a.servicePrice,
    service: { id: a.serviceId, name: service?.name ?? "" },
  };
}

/** Quita las claves `undefined` (como hace Prisma en un update parcial). */
function defined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const ownsBusiness = (state: { businesses: DemoBusiness[] }, userId: number, businessId: number) =>
  state.businesses.some((b) => b.id === businessId && b.ownerId === userId);

export function createLocalRepositories(): Repositories {
  return {
    businesses: {
      async findBySlug(slug) {
        const b = getDemoState().businesses.find((x) => x.slug === slug);
        return b ? { id: b.id, ...toPublicBusiness(b) } : null;
      },

      async findPublicPage(slug) {
        const state = getDemoState();
        const b = state.businesses.find((x) => x.slug === slug);
        if (!b) return null;
        const rule = state.rules.find((r) => r.businessId === b.id);
        return {
          id: b.id,
          ...toPublicBusiness(b),
          bookingRule: rule
            ? {
                slotIntervalMinutes: rule.slotIntervalMinutes,
                minNoticeMinutes: rule.minNoticeMinutes,
                maxAdvanceDays: rule.maxAdvanceDays,
              }
            : null,
          services: state.services
            .filter((s) => s.businessId === b.id && s.isActive)
            .sort(byName)
            .map(({ id, name, description, durationMinutes, price }) => ({
              id,
              name,
              description,
              durationMinutes,
              price,
            })),
        };
      },

      async listWithActiveServices(limit) {
        const state = getDemoState();
        return state.businesses
          .filter((b) => state.services.some((s) => s.businessId === b.id && s.isActive))
          .sort(byName)
          .slice(0, limit)
          .map(({ name, slug, description }) => ({ name, slug, description }));
      },

      async findOwned(userId, businessId) {
        const b = getDemoState().businesses.find((x) => x.id === businessId && x.ownerId === userId);
        return b ? toOwnedBusiness(b) : null;
      },

      async listOwned(userId) {
        return getDemoState()
          .businesses.filter((b) => b.ownerId === userId)
          .sort((a, b) => a.id - b.id)
          .map(toOwnedBusiness);
      },

      async create(userId, data, rule) {
        return updateDemoState((state) => {
          if (state.businesses.some((b) => b.slug === data.slug)) throw new ConstraintViolation("unique");
          const business: DemoBusiness = {
            id: state.nextIds.business++,
            ownerId: userId,
            ...data,
            createdAt: new Date().toISOString(),
          };
          state.businesses.push(business);
          state.rules.push({ businessId: business.id, ...rule });
          return toOwnedBusiness(business);
        });
      },

      async update(userId, businessId, data) {
        return updateDemoState((state) => {
          const business = state.businesses.find((b) => b.id === businessId && b.ownerId === userId);
          if (!business) return false;
          const changes = defined(data);
          if (changes.slug && state.businesses.some((b) => b.id !== businessId && b.slug === changes.slug)) {
            throw new ConstraintViolation("unique");
          }
          Object.assign(business, changes);
          return true;
        });
      },
    },

    bookingRules: {
      async find(businessId) {
        const rule = getDemoState().rules.find((r) => r.businessId === businessId);
        if (!rule) return null;
        const { slotIntervalMinutes, minNoticeMinutes, maxAdvanceDays } = rule;
        return { slotIntervalMinutes, minNoticeMinutes, maxAdvanceDays };
      },

      async upsert(businessId, data) {
        return updateDemoState((state) => {
          state.rules = [...state.rules.filter((r) => r.businessId !== businessId), { businessId, ...data }];
          return { ...data };
        });
      },
    },

    hours: {
      async list(businessId, dayOfWeek) {
        return getDemoState()
          .hours.filter((h) => h.businessId === businessId && (dayOfWeek === undefined || h.dayOfWeek === dayOfWeek))
          .sort(byHours)
          .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
      },

      async openDays(businessId) {
        const days = getDemoState()
          .hours.filter((h) => h.businessId === businessId)
          .map((h) => h.dayOfWeek);
        return [...new Set(days)];
      },

      async replace(userId, businessId, hours) {
        return updateDemoState((state) => {
          if (!ownsBusiness(state, userId, businessId)) return null;
          state.hours = [
            ...state.hours.filter((h) => h.businessId !== businessId),
            ...hours.map((h) => ({ businessId, ...h })),
          ];
          return [...hours].sort(byHours).map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
        });
      },
    },

    services: {
      async list(businessId, { activeOnly }) {
        return getDemoState()
          .services.filter((s) => s.businessId === businessId && (!activeOnly || s.isActive))
          .sort((a, b) => Number(b.isActive) - Number(a.isActive) || byName(a, b))
          .map(toService);
      },

      async findActive(businessId, serviceId) {
        const s = getDemoState().services.find(
          (x) => x.id === serviceId && x.businessId === businessId && x.isActive,
        );
        return s ? toService(s) : null;
      },

      async create(businessId, data) {
        return updateDemoState((state) => {
          const service: DemoService = {
            ...data,
            isActive: data.isActive ?? true,
            id: state.nextIds.service++,
            businessId,
          };
          state.services.push(service);
          return toService(service);
        });
      },

      async update(userId, businessId, serviceId, data) {
        return updateDemoState((state) => {
          if (!ownsBusiness(state, userId, businessId)) return null;
          const service = state.services.find((s) => s.id === serviceId && s.businessId === businessId);
          if (!service) return null;
          Object.assign(service, defined(data));
          return toService(service);
        });
      },
    },

    appointments: {
      async findOverlapping(businessId, from, to, statuses) {
        return getDemoState()
          .appointments.filter(
            (a) =>
              a.businessId === businessId &&
              statuses.includes(a.status) &&
              Date.parse(a.startAt) < to.getTime() &&
              Date.parse(a.endAt) > from.getTime(),
          )
          .map((a) => ({ startAt: new Date(a.startAt), endAt: new Date(a.endAt) }));
      },

      async create(data) {
        return updateDemoState((state) => {
          const overlaps = state.appointments.some(
            (a) =>
              a.businessId === data.businessId &&
              BLOCKING.includes(a.status) &&
              Date.parse(a.startAt) < data.endAt.getTime() &&
              Date.parse(a.endAt) > data.startAt.getTime(),
          );
          if (overlaps) throw new ConstraintViolation("overlap");

          const appointment: DemoAppointment = {
            ...data,
            id: state.nextIds.appointment++,
            startAt: data.startAt.toISOString(),
            endAt: data.endAt.toISOString(),
            status: "CONFIRMED",
          };
          state.appointments.push(appointment);
          return {
            id: appointment.id,
            startAt: new Date(appointment.startAt),
            endAt: new Date(appointment.endAt),
            status: appointment.status,
          };
        });
      },

      async listInRange(businessId, from, to) {
        const state = getDemoState();
        return state.appointments
          .filter(
            (a) =>
              a.businessId === businessId &&
              Date.parse(a.startAt) >= from.getTime() &&
              Date.parse(a.startAt) < to.getTime(),
          )
          .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
          .map((a) => toAdminAppointment(a, state.services));
      },

      async transitionFromConfirmed(userId, businessId, appointmentId, status) {
        return updateDemoState((state) => {
          if (!ownsBusiness(state, userId, businessId)) return { appointment: null, applied: false };
          const appointment = state.appointments.find((a) => a.id === appointmentId && a.businessId === businessId);
          if (!appointment) return { appointment: null, applied: false };

          const applied = appointment.status === "CONFIRMED";
          if (applied) appointment.status = status;
          return { appointment: toAdminAppointment(appointment, state.services), applied };
        });
      },
    },

    users: {
      async findByEmail(email) {
        const user = getDemoState().users.find((u) => u.email === email);
        return user ? { ...user, passwordHash: null } : null;
      },

      async create(data) {
        return updateDemoState((state) => {
          if (state.users.some((u) => u.email === data.email)) throw new ConstraintViolation("unique");
          const user = { id: state.nextIds.user++, name: data.name, email: data.email };
          state.users.push(user);
          return user;
        });
      },
    },
  };
}
