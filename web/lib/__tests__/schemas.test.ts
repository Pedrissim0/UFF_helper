import {
  DisciplinaUploadSchema,
  FormDisciplinaSchema,
  FormProjecaoSchema,
  validarLinhasUpload,
} from "../schemas";

describe("DisciplinaUploadSchema", () => {
  const valido = {
    codigo: "ECO00101",
    nome: "MICROECONOMIA I",
    situacao: "Aprovado",
    turma: "A1",
    nota: 8.5,
    vs: null,
    frequencia: 90,
    horas: 60,
    creditos: 4,
    semestre: "2025.1",
  };

  it("aceita disciplina válida", () => {
    expect(DisciplinaUploadSchema.safeParse(valido).success).toBe(true);
  });

  it("rejeita código vazio", () => {
    expect(DisciplinaUploadSchema.safeParse({ ...valido, codigo: "" }).success).toBe(
      false
    );
  });

  it("rejeita nome vazio", () => {
    expect(DisciplinaUploadSchema.safeParse({ ...valido, nome: "" }).success).toBe(false);
  });

  it("rejeita nota > 10", () => {
    expect(DisciplinaUploadSchema.safeParse({ ...valido, nota: 11 }).success).toBe(false);
  });

  it("rejeita nota < 0", () => {
    expect(DisciplinaUploadSchema.safeParse({ ...valido, nota: -1 }).success).toBe(false);
  });

  it("aceita nota null", () => {
    expect(DisciplinaUploadSchema.safeParse({ ...valido, nota: null }).success).toBe(
      true
    );
  });

  it("usa default 0 para horas quando ausente", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { horas, ...semHoras } = valido;
    const result = DisciplinaUploadSchema.safeParse(semHoras);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.horas).toBe(0);
  });
});

describe("FormDisciplinaSchema", () => {
  const valido = {
    codigo: "ECO00101",
    nome: "Microeconomia I",
    situacao: "Aprovado",
    nota: 7,
    vs: null,
    horas: 60,
    semestre: "2025.1",
  };

  it("aceita formulário válido", () => {
    expect(FormDisciplinaSchema.safeParse(valido).success).toBe(true);
  });

  it("rejeita semestre em formato errado", () => {
    expect(
      FormDisciplinaSchema.safeParse({ ...valido, semestre: "1/2025" }).success
    ).toBe(false);
  });

  it("rejeita semestre com período 3", () => {
    expect(
      FormDisciplinaSchema.safeParse({ ...valido, semestre: "2025.3" }).success
    ).toBe(false);
  });

  it("aceita semestre 2025.2", () => {
    expect(
      FormDisciplinaSchema.safeParse({ ...valido, semestre: "2025.2" }).success
    ).toBe(true);
  });
});

describe("FormProjecaoSchema", () => {
  it("aceita projeção válida", () => {
    expect(FormProjecaoSchema.safeParse({ nota: 10, semestre: "2026.1" }).success).toBe(
      true
    );
  });

  it("rejeita nota > 10", () => {
    expect(FormProjecaoSchema.safeParse({ nota: 11, semestre: "2026.1" }).success).toBe(
      false
    );
  });

  it("rejeita semestre inválido", () => {
    expect(FormProjecaoSchema.safeParse({ nota: 8, semestre: "abc" }).success).toBe(
      false
    );
  });
});

describe("validarLinhasUpload", () => {
  it("separa linhas válidas e inválidas", () => {
    const rows = [
      {
        codigo: "ECO001",
        nome: "Micro",
        situacao: "Aprovado",
        turma: "A1",
        nota: 8,
        vs: null,
        frequencia: null,
        horas: 60,
        creditos: 4,
        semestre: "2025.1",
      },
      {
        codigo: "",
        nome: "",
        situacao: "",
        turma: "",
        nota: null,
        vs: null,
        frequencia: null,
        horas: 0,
        creditos: 0,
        semestre: "",
      },
    ];
    const result = validarLinhasUpload(rows);
    expect(result.validas).toHaveLength(1);
    expect(result.ignoradas).toBe(1);
  });
});
