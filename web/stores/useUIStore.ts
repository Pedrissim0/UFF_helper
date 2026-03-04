import { create } from "zustand";
import { persist } from "zustand/middleware";

type Tema = "light" | "dark";

interface UIState {
  tema: Tema;
  toggleTema: () => void;
  _hydrateTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      tema: "light",

      toggleTema: () => {
        const next = get().tema === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        set({ tema: next });
      },

      /** Deve ser chamada uma vez no mount do primeiro componente que usa tema. */
      _hydrateTheme: () => {
        const stored = get().tema;
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const tema = stored !== "light" ? stored : prefersDark ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", tema);
        if (tema !== get().tema) set({ tema });
      },
    }),
    {
      name: "tema",
      partialize: (s) => ({ tema: s.tema }),
    }
  )
);
