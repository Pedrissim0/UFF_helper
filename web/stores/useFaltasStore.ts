import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DisciplinaFalta {
  codigo: string;
  nome: string;
  professor_id: string;
  carga_horaria: number;
  aulas_por_semana: number;
  faltas: number;
  limite: number;
}

interface FaltasState {
  disciplinas: DisciplinaFalta[];
  ultimaAtualizacao: string;

  setDisciplinas: (disciplinas: DisciplinaFalta[]) => void;
  incrementar: (codigo: string) => void;
  decrementar: (codigo: string) => void;
  remover: (codigo: string) => void;
  limpar: () => void;
}

export const useFaltasStore = create<FaltasState>()(
  persist(
    (set, get) => ({
      disciplinas: [],
      ultimaAtualizacao: "",

      setDisciplinas: (disciplinas) =>
        set({ disciplinas, ultimaAtualizacao: new Date().toISOString() }),

      incrementar: (codigo) => {
        const disciplinas = get().disciplinas.map((d) =>
          d.codigo === codigo ? { ...d, faltas: d.faltas + 1 } : d
        );
        set({ disciplinas, ultimaAtualizacao: new Date().toISOString() });
      },

      decrementar: (codigo) => {
        const disciplinas = get().disciplinas.map((d) =>
          d.codigo === codigo && d.faltas > 0 ? { ...d, faltas: d.faltas - 1 } : d
        );
        set({ disciplinas, ultimaAtualizacao: new Date().toISOString() });
      },

      remover: (codigo) => {
        const disciplinas = get().disciplinas.filter((d) => d.codigo !== codigo);
        set({ disciplinas, ultimaAtualizacao: new Date().toISOString() });
      },

      limpar: () => set({ disciplinas: [], ultimaAtualizacao: new Date().toISOString() }),
    }),
    {
      name: "grade-horaria:controlador-faltas",
      partialize: (s) => ({
        disciplinas: s.disciplinas,
        ultimaAtualizacao: s.ultimaAtualizacao,
      }),
    }
  )
);
