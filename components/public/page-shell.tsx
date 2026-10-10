/** Contenedor de las páginas de negocio: columna centrada y legible en móvil. Header y footer vienen del layout. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">{children}</main>;
}
