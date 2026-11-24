export type UnitSystem = "metric" | "imperial";

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const toKg = (v: number, u: UnitSystem) => (u === "imperial" ? v * KG_PER_LB : v);
export const toCm = (v: number, u: UnitSystem) => (u === "imperial" ? v * CM_PER_IN : v);
export const fromKg = (kg: number, u: UnitSystem) => (u === "imperial" ? kg / KG_PER_LB : kg);
export const fromCm = (cm: number, u: UnitSystem) => (u === "imperial" ? cm / CM_PER_IN : cm);

export const weightUnit = (u: UnitSystem) => (u === "imperial" ? "lb" : "kg");
export const heightUnit = (u: UnitSystem) => (u === "imperial" ? "in" : "cm");

export function formatWeight(kg: number, u: UnitSystem, digits = 1) {
  const v = fromKg(kg, u);
  return `${Number.isInteger(v) ? v : v.toFixed(digits)} ${weightUnit(u)}`;
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n);
}
