/** Formateo para mostrar en UI (seguro en cliente). No usar para cálculos. */

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

/** "12000.00" → "$ 12.000". El importe exacto viaja como string; esto es solo visual. */
export function formatPrice(price: string): string {
  return ars.format(Number(price)).replace(/,00$/, "");
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
