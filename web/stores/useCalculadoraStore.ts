import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DisciplinaHistorico {
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

/** Fonte dos dados: arquivo importado, preenchimento manual, ou nada ainda. */
export type FonteDados = "upload" | "manual" | null;

interface CalculadoraState {
  disciplinas: DisciplinaHistorico[];
  fonte: FonteDados;

  setDisciplinas: (disciplinas: DisciplinaHistorico[]) => void;
  setFonte: (fonte: FonteDados) => void;
  limpar: () => void;
}

export const useCalculadoraStore = create<CalculadoraState>()(
  persist(
    (set) => ({
      disciplinas: [],
      fonte: null,

      setDisciplinas: (disciplinas) => set({ disciplinas }),
      setFonte: (fonte) => set({ fonte }),
      limpar: () => set({ disciplinas: [], fonte: null }),
    }),
    {
      name: "grade-horaria:calculadora-cr",
      partialize: (s) => ({ disciplinas: s.disciplinas, fonte: s.fonte }),
    }
  )
);
