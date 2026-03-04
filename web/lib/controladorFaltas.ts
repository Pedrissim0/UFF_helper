const KEY = "grade-horaria:controlador-faltas";
const KEY_CR = "grade-horaria:calculadora-cr";

export interface DisciplinaFaltas {
  codigo: string;
  nome: string;
  professor_id: string;
  carga_horaria: number;
  aulas_por_semana: number;
  faltas: number;
  limite: number;
}

export interface ControladorData {
  disciplinas: DisciplinaFaltas[];
  ultima_atualizacao: string;
}

export function getControlador(): ControladorData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ControladorData) : null;
  } catch {
    return null;
  }
}

export function setControlador(data: ControladorData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

export function clearControlador(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // localStorage unavailable
  }
}

export function getProjecoesCR(): Array<{ codigo: string; nome: string }> {
  try {
    const raw = localStorage.getItem(KEY_CR);
    if (!raw) return [];
    const data = JSON.parse(raw) as {
      disciplinas?: Array<{ codigo: string; nome: string; isProjecao?: boolean }>;
    };
    const disciplinas = data?.disciplinas ?? [];
    return disciplinas
      .filter((d) => d.isProjecao === true)
      .map((d) => ({ codigo: d.codigo, nome: d.nome }));
  } catch {
    return [];
  }
}
