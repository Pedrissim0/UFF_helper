const SEMANAS = 15;

export function calcularLimiteFaltas(
  ch: number,
  horarios: Record<string, string>
): number {
  const aulasPorSemana = Object.values(horarios).filter((h) => h.trim() !== "").length;
  const totalAulas = aulasPorSemana * SEMANAS;
  if (totalAulas === 0) return 0;
  const horasPorAula = ch / totalAulas;
  return Math.floor((ch * 0.25) / horasPorAula); // = floor(0.25 * totalAulas)
}
