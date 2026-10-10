"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api-client";
import { replaceHoursSchema } from "@/schemas/businesses";

type Interval = { dayOfWeek: number; startTime: string; endTime: string };
type Row = Interval & { key: number };

// Orden de lunes a domingo; dayOfWeek usa 0=domingo..6=sábado.
const DAYS = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miércoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sábado" },
  { dayOfWeek: 0, label: "Domingo" },
];

let nextKey = 0;
const withKey = (interval: Interval): Row => ({ ...interval, key: nextKey++ });

/** Editor de la agenda semanal: se guarda todo junto (reemplazo atómico). */
export function HoursEditor({ businessId, hours }: { businessId: number; hours: Interval[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => hours.map(withKey));
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string }>();
  const [saving, setSaving] = useState(false);

  function update(key: number, patch: Partial<Interval>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setMessage(undefined);
  }

  function add(dayOfWeek: number) {
    const sameDay = rows.filter((r) => r.dayOfWeek === dayOfWeek).sort((a, b) => a.endTime.localeCompare(b.endTime));
    const last = sameDay.at(-1);
    // Propone una franja después de la última del día (o 09:00–13:00 si no hay).
    const interval = last && last.endTime < "20:00"
      ? { dayOfWeek, startTime: last.endTime, endTime: "20:00" }
      : { dayOfWeek, startTime: "09:00", endTime: "13:00" };
    setRows((current) => [...current, withKey(interval)]);
    setMessage(undefined);
  }

  function remove(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
    setMessage(undefined);
  }

  async function save() {
    const payload = { hours: rows.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })) };
    const parsed = replaceHoursSchema.safeParse(payload);
    if (!parsed.success) {
      return setMessage({ type: "error", text: parsed.error.issues[0]?.message ?? "Revisá los horarios." });
    }
    setSaving(true);
    const result = await apiRequest(`/api/admin/businesses/${businessId}/hours`, "PUT", parsed.data);
    setSaving(false);
    if (!result.ok) return setMessage({ type: "error", text: result.message });
    setMessage({ type: "success", text: "Horarios guardados." });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {DAYS.map((day) => {
          const dayRows = rows
            .filter((r) => r.dayOfWeek === day.dayOfWeek)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <li key={day.dayOfWeek} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
              <span className="w-24 pt-1 font-medium">{day.label}</span>
              <div className="flex flex-1 flex-col gap-2">
                {dayRows.length === 0 && <span className="pt-1 text-sm text-muted-foreground">Cerrado</span>}
                {dayRows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <Input
                      type="time"
                      step={300}
                      aria-label={`${day.label}: apertura`}
                      value={row.startTime}
                      onChange={(e) => update(row.key, { startTime: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="time"
                      step={300}
                      aria-label={`${day.label}: cierre`}
                      value={row.endTime}
                      onChange={(e) => update(row.key, { endTime: e.target.value })}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar franja del ${day.label.toLowerCase()}`}
                      onClick={() => remove(row.key)}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => add(day.dayOfWeek)}>
                  <Plus aria-hidden />
                  Agregar franja
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Button onClick={save} disabled={saving} className="self-start" size="lg">
        {saving ? "Guardando…" : "Guardar horarios"}
      </Button>
    </div>
  );
}
