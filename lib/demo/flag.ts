/**
 * Modo demo: sin base de datos, con los datos de cada visitante en su
 * localStorage. Se fija en el build (`NEXT_PUBLIC_*`), así vale igual en el
 * servidor y en el navegador.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
