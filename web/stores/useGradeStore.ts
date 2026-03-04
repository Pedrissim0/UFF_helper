import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SelectedCourse {
  codigo: string;
  turma: string;
}

interface GradeState {
  selecionadas: SelectedCourse[];
  periodosColapsados: string[];

  setSelecionadas: (selecionadas: SelectedCourse[]) => void;
  togglePeriodo: (key: string) => void;
  setPeriodosColapsados: (periodos: string[]) => void;
  limpar: () => void;
}

export const useGradeStore = create<GradeState>()(
  persist(
    (set, get) => ({
      selecionadas: [],
      periodosColapsados: [],

      setSelecionadas: (selecionadas) => set({ selecionadas }),

      togglePeriodo: (key) => {
        const prev = get().periodosColapsados;
        const next = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key];
        set({ periodosColapsados: next });
      },

      setPeriodosColapsados: (periodos) => set({ periodosColapsados: periodos }),

      limpar: () => set({ selecionadas: [] }),
    }),
    {
      name: "grade-horaria:grade",
      partialize: (s) => ({
        selecionadas: s.selecionadas,
        periodosColapsados: s.periodosColapsados,
      }),
    }
  )
);
