// Sin dependencias de React: lo importa el layout raíz (componente de servidor).

/** "system" sigue al sistema operativo y es el valor por defecto (no se guarda nada). */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Script para <head>: aplica la clase `dark` antes del primer pintado (sin
 * destello) y, mientras la preferencia sea "system", sigue los cambios del
 * sistema y de otras pestañas. Va como string porque corre antes que React.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement,m=matchMedia("${DARK_QUERY}");function a(){var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}var k=t==="dark"||(t!=="light"&&m.matches);d.classList.toggle("dark",k);d.style.colorScheme=k?"dark":"light"}a();m.addEventListener("change",a);addEventListener("storage",function(e){if(e.key==="${THEME_STORAGE_KEY}")a()})}catch(e){}})()`;
