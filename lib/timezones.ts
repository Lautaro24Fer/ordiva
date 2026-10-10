/** Zonas ofrecidas en los formularios (el backend acepta cualquier IANA válida). */
export const TIMEZONE_OPTIONS = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Montevideo", label: "Uruguay (Montevideo)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Asuncion", label: "Paraguay (Asunción)" },
  { value: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "Europe/Madrid", label: "España (Madrid)" },
] as const;

/** "Peluquería Ñandú 2" → "peluqueria-nandu-2" (mismo formato que valida el backend). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}
