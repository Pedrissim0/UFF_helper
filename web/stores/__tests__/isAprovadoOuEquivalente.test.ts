import { isAprovadoOuEquivalente } from "../useDisciplinasStore";

describe("isAprovadoOuEquivalente", () => {
  it("reconhece 'Aprovado'", () => {
    expect(isAprovadoOuEquivalente("Aprovado")).toBe(true);
  });

  it("reconhece 'aprovado' (minúsculo)", () => {
    expect(isAprovadoOuEquivalente("aprovado")).toBe(true);
  });

  it("reconhece 'Aprovado por Nota'", () => {
    expect(isAprovadoOuEquivalente("Aprovado por Nota")).toBe(true);
  });

  it("reconhece 'Aproveitamento'", () => {
    expect(isAprovadoOuEquivalente("Aproveitamento")).toBe(true);
  });

  it("reconhece 'Dispensa'", () => {
    expect(isAprovadoOuEquivalente("Dispensa")).toBe(true);
  });

  it("reconhece 'Dispensado'", () => {
    expect(isAprovadoOuEquivalente("Dispensado")).toBe(true);
  });

  it("rejeita 'Reprovado'", () => {
    expect(isAprovadoOuEquivalente("Reprovado")).toBe(false);
  });

  it("rejeita 'Trancamento'", () => {
    expect(isAprovadoOuEquivalente("Trancamento")).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(isAprovadoOuEquivalente("")).toBe(false);
  });

  it("rejeita 'Matriculado'", () => {
    expect(isAprovadoOuEquivalente("Matriculado")).toBe(false);
  });
});
