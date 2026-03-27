import { formatarNomeDisciplina } from "../formatarNomeDisciplina";

describe("formatarNomeDisciplina", () => {
  it("converte para title case", () => {
    expect(formatarNomeDisciplina("MICROECONOMIA")).toBe("Microeconomia");
  });

  it("mantém numerais romanos em maiúsculo", () => {
    expect(formatarNomeDisciplina("MICROECONOMIA I")).toBe("Microeconomia I");
    expect(formatarNomeDisciplina("MACROECONOMIA III")).toBe("Macroeconomia III");
    expect(formatarNomeDisciplina("ECONOMIA XII")).toBe("Economia XII");
  });

  it("preposições ficam em minúsculo (exceto na primeira posição)", () => {
    expect(formatarNomeDisciplina("INTRODUCAO A ECONOMIA")).toBe("Introducao a Economia");
    expect(formatarNomeDisciplina("HISTORIA DO PENSAMENTO")).toBe(
      "Historia do Pensamento"
    );
  });

  it("primeira palavra sempre com maiúscula, mesmo se preposição", () => {
    expect(formatarNomeDisciplina("DE ECONOMIA")).toBe("De Economia");
  });

  it("lida com múltiplos espaços", () => {
    expect(formatarNomeDisciplina("MICRO  I")).toBe("Micro I");
  });

  it("string vazia retorna vazia", () => {
    expect(formatarNomeDisciplina("")).toBe("");
  });
});
