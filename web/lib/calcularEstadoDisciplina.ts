export type EstadoDisciplina =
  | "aprovado"
  | "desbloqueado"
  | "normal"
  | "bloqueado";

/**
 * Retorna o estado visual de uma disciplina com base nas aprovações do aluno.
 *
 * - aprovado    → já aprovado
 * - desbloqueado → todos os pré-requisitos cumpridos, ainda não cursada
 * - normal      → sem pré-requisitos, ainda não cursada
 * - bloqueado   → tem pré-requisitos, mas nem todos foram cumpridos
 */
export function calcularEstadoDisciplina(
  codigo: string,
  preRequisitos: string[],
  aprovadas: string[]
): EstadoDisciplina {
  if (aprovadas.includes(codigo)) return "aprovado";
  if (preRequisitos.length === 0) return "normal";
  if (preRequisitos.every((p) => aprovadas.includes(p))) return "desbloqueado";
  return "bloqueado";
}
