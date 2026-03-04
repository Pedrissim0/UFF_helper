import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * isAprovadoOuEquivalente — versão canônica unificada.
 * Inclui "aproveitamento" (que faltava em disciplinasAprovadas.ts).
 */
export function isAprovadoOuEquivalente(situacao: string): boolean {
  const s = situacao.toLowerCase();
  return s.includes("aprovado") || s.includes("aproveitamento") || s.includes("dispens");
}

interface DisciplinasState {
  /** Códigos de disciplinas aprovadas (sem projeções). */
  aprovadas: string[];

  setAprovadas: (
    disciplinas: Array<{ codigo: string; situacao: string; isProjecao?: boolean }>
  ) => void;
  clearAprovadas: () => void;
  isAprovada: (codigo: string) => boolean;
}

export const useDisciplinasStore = create<DisciplinasState>()(
  persist(
    (set, get) => ({
      aprovadas: [],

      setAprovadas: (disciplinas) => {
        const codigos = disciplinas
          .filter((d) => isAprovadoOuEquivalente(d.situacao) && d.codigo && !d.isProjecao)
          .map((d) => d.codigo);
        set({ aprovadas: codigos });
      },

      clearAprovadas: () => set({ aprovadas: [] }),

      isAprovada: (codigo) => get().aprovadas.includes(codigo),
    }),
    {
      name: "grade-horaria:aprovadas",
      partialize: (s) => ({ aprovadas: s.aprovadas }),
    }
  )
);
