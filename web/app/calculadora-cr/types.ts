import rawCatalog from "@/data/db_disciplinas.json";
import matrizRaw from "@/data/matriz_curricular.json";

/* ── Types ─────────────────────────────────────── */
export interface Disciplina {
  codigo: string;
  nome: string;
  situacao: string;
  turma: string;
  nota: number | null;
  vs: number | null;
  frequencia: number | null;
  horas: number;
  creditos: number;
  semestre: string;
  isProjecao?: boolean;
}

export interface FormState {
  busca: string;
  codigo: string;
  nome: string;
  situacao: string;
  nota: string;
  vs: string;
  horas: string;
  semestre: string;
}

export interface FormPeriodo {
  periodo: number;
  semestreIngresso: string;
}

export interface HistoricoEntry {
  periodo: string;
  cr: number;
  temProjecao: boolean;
}

export type ModalState =
  | { aberto: false }
  | { aberto: true; tipo: "novo" }
  | { aberto: true; tipo: "projecao" }
  | { aberto: true; tipo: "editando"; index: number };

export type WidgetView = "tabela" | "grafico";
export type AnimDir = "toChart" | "toTable";

/* ── Catálogo para autocomplete ─────────────────── */
export interface CatalogItem {
  codigo: string;
  nome: string;
  ch: number;
  corequisitos: string[];
}

interface MatrizDisciplina {
  codigo: string;
  nome: string;
  periodo: number | null;
  tipo: string;
  corequisitos: string[];
}

export const CATALOG: CatalogItem[] = Object.values(
  (
    rawCatalog as {
      codigo: string;
      nome: string;
      ch: number | null;
      corequisitos?: string[];
    }[]
  ).reduce((acc: Record<string, CatalogItem>, d) => {
    if (!acc[d.codigo])
      acc[d.codigo] = {
        codigo: d.codigo,
        nome: d.nome,
        ch: d.ch ?? 60,
        corequisitos: d.corequisitos ?? [],
      };
    return acc;
  }, {})
);

export const CATALOG_MAP: Record<string, CatalogItem> = {};
CATALOG.forEach((item) => (CATALOG_MAP[item.codigo] = item));

const MATRIZ_DISCIPLINAS = (matrizRaw as { disciplinas: MatrizDisciplina[] }).disciplinas;
export const MATRIZ_OBRIGATORIAS = MATRIZ_DISCIPLINAS.filter(
  (d): d is MatrizDisciplina & { periodo: number } =>
    d.tipo === "obrigatoria" && d.periodo !== null
);
export const MAX_PERIODO = Math.max(...MATRIZ_OBRIGATORIAS.map((d) => d.periodo));
export const HORAS_TOTAIS = (
  matrizRaw as { carga_horaria_total: number; disciplinas: MatrizDisciplina[] }
).carga_horaria_total;

/* ── Constants ──────────────────────────────────── */
export const FORM_VAZIO: FormState = {
  busca: "",
  codigo: "",
  nome: "",
  situacao: "Aprovado",
  nota: "",
  vs: "",
  horas: "",
  semestre: "",
};

export const SITUACOES = [
  "Aprovado",
  "Aproveitamento",
  "Reprovado",
  "Trancamento",
  "Trancado",
  "Atividade Complementar",
  "Dispensa",
  "Monitoria",
  "Aprovado Curso de Férias",
];

export const SITUACOES_EXCLUIDAS = [
  "trancamento",
  "trancado",
  "atividade complementar",
  "dispensa",
  "monitoria",
];

/* ── Helpers ───────────────────────────────────── */
export function estaExcluida(d: Disciplina): boolean {
  const s = d.situacao.toLowerCase();
  return SITUACOES_EXCLUIDAS.some((k) => s.includes(k));
}

export function parseSem(s: string): { year: number; num: number } {
  let m = s.match(/^(\d{4})\.([12])$/);
  if (m) return { year: parseInt(m[1]), num: parseInt(m[2]) };
  m = s.match(/(\d+)[°º]?\/(\d{4})/);
  if (m) return { num: parseInt(m[1]), year: parseInt(m[2]) };
  return { num: 0, year: 0 };
}

export function normalizeSem(s: string): string {
  const { year, num } = parseSem(s);
  if (year && num) return `${year}.${num}`;
  return s;
}

export function computeSemestrePorPeriodo(
  entryYear: number,
  entryNum: number,
  periodo: number
): string {
  let year = entryYear;
  let num = entryNum + (periodo - 1);
  while (num > 2) {
    num -= 2;
    year++;
  }
  return `${year}.${num}`;
}

export function eCovidReprovado(d: Disciplina): boolean {
  const { year } = parseSem(d.semestre);
  return year >= 2020 && year <= 2022 && d.situacao.toLowerCase().includes("reprovado");
}

export function calcularNotaEfetiva(d: Disciplina): number {
  let nota = d.nota ?? 0;
  if (d.vs !== null) {
    const s = d.situacao.toLowerCase();
    if ((s.includes("aprovado") || s.includes("aproveitamento")) && d.vs > 6) nota = d.vs;
    else if (s.includes("reprovado")) nota = (nota + d.vs) / 2;
  }
  return nota;
}

export function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v)
    .replace(",", ".")
    .replace(/[^0-9.\-]/g, "");
  const n = typeof v === "number" ? v : parseFloat(s);
  return isNaN(n) ? null : n;
}

export function clampNota(value: string): string {
  const n = parseFloat(value);
  if (!isNaN(n) && n > 10) return "10";
  if (!isNaN(n) && n < 0) return "0";
  return value;
}

export function truncateCR(cr: number): string {
  return (Math.trunc(cr * 10) / 10).toFixed(1);
}

export function currentSemester(): string {
  const now = new Date();
  return `${now.getFullYear()}.${now.getMonth() < 6 ? 1 : 2}`;
}

export function badgeClass(situacao: string, styles: Record<string, string>): string {
  const s = situacao.toLowerCase();
  if (s.includes("aprovado") || s.includes("aproveitamento")) return styles.badgeAprovado;
  if (s.includes("reprovado")) return styles.badgeReprovado;
  if (s.includes("trancamento")) return styles.badgeTrancamento;
  return styles.badgeNeutro;
}
