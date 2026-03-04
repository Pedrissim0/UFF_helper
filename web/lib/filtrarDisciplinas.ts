import type { Materia } from "@/app/page";

type Dia = keyof Materia["horarios"];

const DIAS: Dia[] = ["seg", "ter", "qua", "qui", "sex", "sab"];

function getStartMin(horario: string): number | null {
  if (!horario) return null;
  const match = horario.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

export interface FiltrosAtivos {
  busca: string;
  dias: Set<string>;
  turnos: Set<string>;
  deptos: Set<string>;
  periodos: Set<string>;
  tipo: "obrigatoria" | "optativa" | null;
  jaCursado: "nao" | "sim" | null;
}

export function filtrarDisciplinas(
  disciplinas: Materia[],
  filtros: FiltrosAtivos,
  aprovadas: Set<string>
): Materia[] {
  let result = disciplinas;

  const q = filtros.busca.toLowerCase();
  if (q) {
    result = result.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        m.codigo.toLowerCase().includes(q) ||
        m.turma.toLowerCase().includes(q) ||
        m.nome_exibicao.toLowerCase().includes(q)
    );
  }

  if (filtros.dias.size > 0) {
    result = result.filter((m) =>
      DIAS.some((d) => filtros.dias.has(d) && m.horarios[d])
    );
  }

  if (filtros.turnos.size > 0) {
    result = result.filter((m) => {
      for (const dia of DIAS) {
        const start = getStartMin(m.horarios[dia]);
        if (start === null) continue;
        if (filtros.turnos.has("manha") && start < 720) return true;
        if (filtros.turnos.has("tarde") && start >= 720 && start < 1080) return true;
        if (filtros.turnos.has("noite") && start >= 1080) return true;
      }
      return false;
    });
  }

  if (filtros.deptos.size > 0) {
    result = result.filter((m) => {
      const depto = m.codigo.replace(/[0-9]/g, "");
      return filtros.deptos.has(depto);
    });
  }

  if (filtros.periodos.size > 0) {
    result = result.filter((m) => {
      const key = m.periodo !== null ? String(m.periodo) : "np";
      return filtros.periodos.has(key);
    });
  }

  if (filtros.tipo) {
    result = result.filter((m) => m.tipo === filtros.tipo);
  }

  if (filtros.jaCursado === "nao") {
    result = result.filter((m) => !aprovadas.has(m.codigo));
  } else if (filtros.jaCursado === "sim") {
    result = result.filter((m) => aprovadas.has(m.codigo));
  }

  return result;
}
