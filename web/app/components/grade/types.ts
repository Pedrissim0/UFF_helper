import type { Materia } from "../../grade/page";

export type Dia = keyof Materia["horarios"];
export type Turno = "manha" | "tarde" | "noite";

export const DIAS: Dia[] = ["seg", "ter", "qua", "qui", "sex", "sab"];
export const DIAS_LABEL: Record<Dia, string> = {
  seg: "SEG",
  ter: "TER",
  qua: "QUA",
  qui: "QUI",
  sex: "SEX",
  sab: "SÁB",
};

export const TURNOS: { key: Turno; label: string }[] = [
  { key: "manha", label: "Manhã" },
  { key: "tarde", label: "Tarde" },
  { key: "noite", label: "Noite" },
];

export const PALETTE = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#84cc16",
];

export const MIN_TIME = 7 * 60;
export const MAX_TIME = 24 * 60;
export const TOTAL = MAX_TIME - MIN_TIME;
export const HOUR_MARKS = [8, 10, 12, 14, 16, 18, 20, 22, 23];

export function toggleSet<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set);
  if (next.has(val)) next.delete(val);
  else next.add(val);
  return next;
}

export function parseTime(
  str: string
): { start: number; end: number; label: string } | null {
  if (!str) return null;
  const [startStr, endStr] = str.split("-");
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return { start: toMin(startStr), end: toMin(endStr), label: str };
}

export function toPercent(min: number) {
  return ((min - MIN_TIME) / TOTAL) * 100;
}
