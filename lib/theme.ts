"use client";

import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme-script";

export type { ThemePreference };

// Si el navegador bloquea localStorage, la elección vale solo para esta página.
let memoryPreference: ThemePreference = "system";
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return memoryPreference;
  }
}

function applyPreference(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setThemePreference(preference: ThemePreference) {
  memoryPreference = preference;
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Sin almacenamiento: se aplica igual, solo que no persiste.
  }
  applyPreference(preference);
  listeners.forEach((listener) => listener());
}

function subscribePreference(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === THEME_STORAGE_KEY && listener();
  addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    removeEventListener("storage", onStorage);
  };
}

/** Preferencia elegida (claro / oscuro / sistema). En el servidor siempre es "system". */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribePreference, readPreference, () => "system");
}

function subscribeResolved(listener: () => void) {
  // La clase la cambian tanto este módulo como el script (cambios del sistema).
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Tema efectivamente aplicado en <html>. */
export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribeResolved,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light",
  );
}
