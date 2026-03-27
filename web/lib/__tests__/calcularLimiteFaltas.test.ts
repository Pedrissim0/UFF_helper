import { calcularLimiteFaltas } from "../calcularLimiteFaltas";

const horarioVazio = { seg: "", ter: "", qua: "", qui: "", sex: "", sab: "" };

describe("calcularLimiteFaltas", () => {
  it("calcula limite para disciplina com 2 dias de aula (ch=60)", () => {
    const horarios = { ...horarioVazio, seg: "14:00-18:00", qua: "14:00-18:00" };
    // 2 aulas/sem * 15 sem = 30 aulas; 25% = 7.5 → floor = 7
    expect(calcularLimiteFaltas(60, horarios)).toBe(7);
  });

  it("calcula limite para disciplina com 1 dia de aula (ch=60)", () => {
    const horarios = { ...horarioVazio, ter: "10:00-12:00" };
    // 1 * 15 = 15; 25% = 3.75 → floor = 3
    expect(calcularLimiteFaltas(60, horarios)).toBe(3);
  });

  it("calcula limite para disciplina com 3 dias de aula (ch=90)", () => {
    const horarios = {
      ...horarioVazio,
      seg: "08:00-10:00",
      qua: "08:00-10:00",
      sex: "08:00-10:00",
    };
    // 3 * 15 = 45; 25% = 11.25 → floor = 11
    expect(calcularLimiteFaltas(90, horarios)).toBe(11);
  });

  it("retorna 0 quando não há horários", () => {
    expect(calcularLimiteFaltas(60, horarioVazio)).toBe(0);
  });

  it("ignora strings com apenas espaços", () => {
    const horarios = { ...horarioVazio, seg: "  " };
    expect(calcularLimiteFaltas(60, horarios)).toBe(0);
  });
});
