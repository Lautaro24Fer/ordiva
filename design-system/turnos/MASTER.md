# Design System: Turnos (MASTER)

Fuente de verdad visual de la plataforma. Las páginas pueden tener overrides en `pages/<pagina>.md`.
Base: recomendación de `ui-ux-pro-max` para "Booking & Appointment App" (Soft UI Evolution + Flat),
ajustada a la marca teal elegida el 2026-10-11.

## Dirección

- **Estilo:** Soft UI Evolution + Flat. Superficies claras, bordes suaves, sombras sutiles, foco siempre visible.
- **Densidad:** estándar (escala de espaciado 16–64 px en páginas públicas; más compacta en el panel).
- **Movimiento:** sutil (150–300 ms, solo `opacity`/`transform`); respetar `prefers-reduced-motion`.
- **Modo oscuro:** tokens definidos pero no es prioridad de producto (no hay toggle).

## Tokens (3 capas, en `app/globals.css`)

1. **Primitivos** (`--teal-*`, `--slate-*`, `--emerald-700`, `--amber-700`, `--red-600`): valores crudos en oklch.
2. **Semánticos** (nombres de shadcn: `--primary`, `--muted-foreground`, …) + `--success`, `--warning`.
3. **Componente**: las variantes `cva` de `components/ui/*` consumen solo semánticos.

Regla: los componentes nunca usan primitivos ni hex sueltos; solo clases semánticas (`bg-primary`, `text-success`, …).

| Rol | Token | Valor claro | Uso |
|-----|-------|-------------|-----|
| Primario | `--primary` | teal-700 `oklch(0.511 0.096 186.4)` | CTA, selección, pasos activos |
| Acento | `--accent` / `--accent-foreground` | teal-50 / teal-900 | fondos de íconos, hover suave |
| Fondo | `--background` | `oklch(0.99 0.004 190)` | página |
| Texto | `--foreground` | `oklch(0.205 0.025 210)` | texto principal |
| Texto secundario | `--muted-foreground` | `oklch(0.49 0.025 210)` | descripciones |
| Éxito | `--success` | emerald-700 | "Confirmado", disponible |
| Aviso | `--warning` | amber-700 | avisos no destructivos |
| Error | `--destructive` | red-600 | errores, cancelar |

Contrastes verificados (WCAG AA ≥ 4.5:1): texto principal 17.3, secundario 6.0, texto sobre primario 5.2,
primario sobre fondo 5.2, éxito 5.2, aviso 4.9. En oscuro, todos ≥ 7.

## Tipografía

- Geist Sans (cuerpo y títulos), Geist Mono para datos. Base 16 px, line-height 1.5.
- Títulos con `tracking-tight`; cifras/horarios con `tabular-nums`.

## Navegación pública

- Header en `app/(public)/layout.tsx`: marca a la izquierda; a la derecha "Ingresar" (ghost) y
  "Registrá tu negocio" (outline, oculto en móvil). Con sesión: "Ir a mi panel".
- La parte que depende de la sesión va en `<Suspense>` con un skeleton del mismo ancho (sin CLS).
- En las páginas de un negocio el protagonista es el negocio: el header es discreto y no tiene botones primarios.
- Clientes: reservan sin cuenta. Login/registro son solo para dueños de negocio; decirlo explícitamente.

## Anti-patrones

- Emojis como íconos (usar Lucide con `aria-hidden`).
- Estados comunicados solo con color u opacidad.
- `window.confirm` para acciones destructivas (usar AlertDialog).
- Hover como única señal de interactividad; quitar anillos de foco.

## Checklist previo a entregar

- [ ] Contraste ≥ 4.5:1 en texto
- [ ] Foco visible en todo lo operable; orden de tabulación = orden visual
- [ ] Áreas táctiles ≥ 24 px (objetivo 36–44 px en móvil)
- [ ] 375 / 768 / 1024 / 1440 px sin scroll horizontal
- [ ] `prefers-reduced-motion` respetado
