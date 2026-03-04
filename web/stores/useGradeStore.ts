import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SelectedCourse {
  codigo: string;
  turma: string;
}

interface GradeState {
  selecionadas: SelectedCourse[];
  periodosColapsados: string[];
  jaCursadoFiltro: "nao" | "sim" | null;

  setSelecionadas: (selecionadas: SelectedCourse[]) => void;
  togglePeriodo: (key: string) => void;
  setPeriodosColapsados: (periodos: string[]) => void;
  setJaCursadoFiltro: (v: "nao" | "sim" | null) => void;
  limpar: () => void;
}

export const useGradeStore = create<GradeState>()(
  persist(
    (set, get) => ({
      selecionadas: [],
      periodosColapsados: [],
      jaCursadoFiltro: null,

      setSelecionadas: (selecionadas) => set({ selecionadas }),

      togglePeriodo: (key) => {
        const prev = get().periodosColapsados;
        const next = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key];
        set({ periodosColapsados: next });
      },

      setPeriodosColapsados: (periodos) => set({ periodosColapsados: periodos }),

      setJaCursadoFiltro: (v) => set({ jaCursadoFiltro: v }),

      limpar: () => set({ selecionadas: [] }),
    }),
    {
      name: "grade-horaria:grade",
      partialize: (s) => ({
        selecionadas: s.selecionadas,
        periodosColapsados: s.periodosColapsados,
        jaCursadoFiltro: s.jaCursadoFiltro,
      }),
    }
  )
);
