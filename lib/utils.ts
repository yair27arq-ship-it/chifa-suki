import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como precio en soles peruanos.
 * Ej: 12.5 → "S/ 12.50"
 */
export function formatPrecio(valor: number): string {
  return `S/ ${Number(valor).toFixed(2)}`;
}

/**
 * Formatea una fecha ISO como hora local.
 */
export function formatHora(fechaISO: string): string {
  return new Date(fechaISO).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  });
}

/**
 * Formatea una fecha ISO como fecha completa.
 */
export function formatFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Lima',
  });
}

/**
 * Obtiene la fecha actual como string YYYY-MM-DD (Lima timezone).
 */
export function getFechaDia(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  });
}
