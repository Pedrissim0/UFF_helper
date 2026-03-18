import type { PeriodoData } from "@/hooks/useRoadmapConnections";

/**
 * Atribui um índice de coluna (0-based) para cada disciplina de forma que
 * disciplinas encadeadas por pré-requisito fiquem na mesma coluna vertical.
 *
 * Regras:
 * 1. Processar períodos em ordem crescente.
 * 2. Para cada disciplina, herdar a coluna do primeiro pré-requisito já posicionado.
 * 3. Se a coluna herdada já estiver ocupada no período atual (conflito), avançar
 *    para a próxima coluna livre a partir daquela posição.
 * 4. Sem pré-requisito: próxima coluna livre a partir de 0.
 */
export function calcularColunas(periodos: PeriodoData[]): Map<string, number> {
  const colunaMap = new Map<string, number>(); // codigo → colIndex

  for (const periodo of periodos) {
    const usedInPeriodo = new Set<number>();

    for (const disc of periodo.disciplinas) {
      // Herdar coluna do primeiro pré-requisito já atribuído
      let targetCol: number | null = null;
      for (const prereqCode of disc.pre_requisitos) {
        const col = colunaMap.get(prereqCode);
        if (col !== undefined) {
          targetCol = col;
          break;
        }
      }

      // Sem pré-req → começar do 0
      if (targetCol === null) targetCol = 0;

      // Avançar até a próxima coluna livre a partir de targetCol
      while (usedInPeriodo.has(targetCol)) {
        targetCol++;
      }

      colunaMap.set(disc.codigo, targetCol);
      usedInPeriodo.add(targetCol);
    }
  }

  return colunaMap;
}

/**
 * Retorna o número total de colunas necessárias (máximo índice + 1).
 */
export function calcularTotalColunas(colunaMap: Map<string, number>): number {
  if (colunaMap.size === 0) return 1;
  return Math.max(...Array.from(colunaMap.values())) + 1;
}
