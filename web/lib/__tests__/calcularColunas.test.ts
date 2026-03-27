import { calcularColunas, calcularTotalColunas } from "../calcularColunas";
import type { PeriodoData } from "@/hooks/useRoadmapConnections";

function periodo(numero: number, discs: PeriodoData["disciplinas"]): PeriodoData {
  return { numero, label: `${numero}° Período`, disciplinas: discs };
}

function disc(
  codigo: string,
  pre_requisitos: string[] = []
): PeriodoData["disciplinas"][number] {
  return { codigo, nome: codigo, carga_horaria: 60, obrigatoria: true, pre_requisitos };
}

describe("calcularColunas", () => {
  it("atribui colunas sequenciais quando não há pré-requisitos", () => {
    const periodos = [periodo(1, [disc("A"), disc("B"), disc("C")])];
    const map = calcularColunas(periodos);
    expect(map.get("A")).toBe(0);
    expect(map.get("B")).toBe(1);
    expect(map.get("C")).toBe(2);
  });

  it("herda coluna do pré-requisito", () => {
    const periodos = [
      periodo(1, [disc("A"), disc("B")]),
      periodo(2, [disc("C", ["B"]), disc("D", ["A"])]),
    ];
    const map = calcularColunas(periodos);
    // B está na coluna 1, C herda
    expect(map.get("C")).toBe(map.get("B"));
    // A está na coluna 0, D herda
    expect(map.get("D")).toBe(map.get("A"));
  });

  it("resolve conflito avançando para próxima coluna livre", () => {
    const periodos = [
      periodo(1, [disc("A")]),
      periodo(2, [disc("B", ["A"]), disc("C", ["A"])]),
    ];
    const map = calcularColunas(periodos);
    // B pega coluna de A (0), C tentaria 0 mas está ocupada → vai pra 1
    expect(map.get("B")).toBe(0);
    expect(map.get("C")).toBe(1);
  });

  it("retorna mapa vazio para lista vazia de períodos", () => {
    const map = calcularColunas([]);
    expect(map.size).toBe(0);
  });
});

describe("calcularTotalColunas", () => {
  it("retorna 1 para mapa vazio", () => {
    expect(calcularTotalColunas(new Map())).toBe(1);
  });

  it("retorna max + 1", () => {
    const map = new Map([
      ["A", 0],
      ["B", 2],
      ["C", 1],
    ]);
    expect(calcularTotalColunas(map)).toBe(3);
  });
});
