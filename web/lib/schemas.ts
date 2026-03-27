import { z } from "zod";

/**
 * Schema para validar cada linha do CSV/XLSX na Calculadora de CR.
 * Linhas inválidas são ignoradas com aviso em vez de quebrar o upload.
 */
export const DisciplinaUploadSchema = z.object({
  codigo: z.string().trim().min(1, "Código é obrigatório"),
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  situacao: z.string().trim(),
  turma: z.string().trim(),
  nota: z.number().min(0, "Nota mínima é 0").max(10, "Nota máxima é 10").nullable(),
  vs: z.number().min(0, "Nota VS mínima é 0").max(10, "Nota VS máxima é 10").nullable(),
  frequencia: z.number().min(0).max(100).nullable(),
  horas: z.number().min(0).default(0),
  creditos: z.number().min(0).default(0),
  semestre: z.string().trim(),
});

/**
 * Schema para o formulário de adicionar/editar disciplina manual.
 */
export const FormDisciplinaSchema = z.object({
  codigo: z.string().trim().min(1, "Código é obrigatório"),
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  situacao: z.string().trim().min(1, "Situação é obrigatória"),
  nota: z.number().min(0, "Nota mínima é 0").max(10, "Nota máxima é 10").nullable(),
  vs: z.number().min(0, "Nota VS mínima é 0").max(10, "Nota VS máxima é 10").nullable(),
  horas: z.number().min(0, "Horas deve ser >= 0"),
  semestre: z
    .string()
    .trim()
    .regex(/^\d{4}\.[12]$/, "Formato deve ser YYYY.1 ou YYYY.2"),
});

/**
 * Schema para o formulário de projeção em lote.
 */
export const FormProjecaoSchema = z.object({
  nota: z.number().min(0, "Nota mínima é 0").max(10, "Nota máxima é 10"),
  semestre: z
    .string()
    .trim()
    .regex(/^\d{4}\.[12]$/, "Formato deve ser YYYY.1 ou YYYY.2"),
});

export type DisciplinaUpload = z.infer<typeof DisciplinaUploadSchema>;
export type FormDisciplinaData = z.infer<typeof FormDisciplinaSchema>;
export type FormProjecaoData = z.infer<typeof FormProjecaoSchema>;

/**
 * Valida um array de linhas do upload e retorna as válidas + contagem de ignoradas.
 */
export function validarLinhasUpload(rows: Record<string, unknown>[]): {
  validas: DisciplinaUpload[];
  ignoradas: number;
} {
  let ignoradas = 0;
  const validas: DisciplinaUpload[] = [];

  for (const row of rows) {
    const result = DisciplinaUploadSchema.safeParse(row);
    if (result.success) {
      validas.push(result.data);
    } else {
      ignoradas++;
    }
  }

  return { validas, ignoradas };
}
