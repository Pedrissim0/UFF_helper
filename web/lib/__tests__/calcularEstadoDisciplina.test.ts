import { calcularEstadoDisciplina } from "../calcularEstadoDisciplina";

describe("calcularEstadoDisciplina", () => {
  const aprovadas = ["MICRO1", "MACRO1"];

  it("retorna 'aprovado' se a disciplina está na lista de aprovadas", () => {
    expect(calcularEstadoDisciplina("MICRO1", [], aprovadas)).toBe("aprovado");
  });

  it("retorna 'normal' se não tem pré-requisitos e não está aprovada", () => {
    expect(calcularEstadoDisciplina("ESTAT", [], aprovadas)).toBe("normal");
  });

  it("retorna 'desbloqueado' se todos os pré-requisitos foram cumpridos", () => {
    expect(calcularEstadoDisciplina("MICRO2", ["MICRO1", "MACRO1"], aprovadas)).toBe(
      "desbloqueado"
    );
  });

  it("retorna 'bloqueado' se algum pré-requisito não foi cumprido", () => {
    expect(calcularEstadoDisciplina("MICRO3", ["MICRO1", "ECONO"], aprovadas)).toBe(
      "bloqueado"
    );
  });

  it("retorna 'bloqueado' se nenhum pré-requisito foi cumprido", () => {
    expect(calcularEstadoDisciplina("ADV", ["X", "Y"], aprovadas)).toBe("bloqueado");
  });

  it("retorna 'aprovado' mesmo com pré-requisitos pendentes (já aprovada)", () => {
    expect(calcularEstadoDisciplina("MICRO1", ["X"], aprovadas)).toBe("aprovado");
  });
});
