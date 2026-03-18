import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export interface DisciplinaData {
  codigo: string;
  nome: string;
  carga_horaria: number;
  obrigatoria: boolean;
  pre_requisitos: string[];
}

export interface PeriodoData {
  numero: number;
  label: string;
  disciplinas: DisciplinaData[];
}

export interface Connection {
  id: string;
  fromCodigo: string;
  toCodigo: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Computes horizontal prereq connections between discipline cards.
 * Each connection goes from the right edge of the prereq card to the
 * left edge of the dependent card (horizontal flowchart layout).
 *
 * @param enabled - When false, skips computation (e.g. mobile layout).
 */
export function useRoadmapConnections(
  periodos: PeriodoData[],
  containerRef: RefObject<HTMLElement>,
  enabled = true
): Connection[] {
  const [connections, setConnections] = useState<Connection[]>([]);

  const compute = useCallback(() => {
    if (!enabled) {
      setConnections([]);
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const result: Connection[] = [];

    for (const periodo of periodos) {
      for (const disc of periodo.disciplinas) {
        for (const prereqCode of disc.pre_requisitos) {
          const fromEl = container.querySelector(
            `[data-codigo="${prereqCode}"]`
          ) as HTMLElement | null;
          const toEl = container.querySelector(
            `[data-codigo="${disc.codigo}"]`
          ) as HTMLElement | null;

          if (!fromEl || !toEl) continue;

          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();

          result.push({
            id: `prereq-${prereqCode}-${disc.codigo}`,
            fromCodigo: prereqCode,
            toCodigo: disc.codigo,
            // Right edge of source, vertical center
            x1: fromRect.right - rect.left,
            y1: fromRect.top - rect.top + fromRect.height / 2,
            // Left edge of target, vertical center
            x2: toRect.left - rect.left,
            y2: toRect.top - rect.top + toRect.height / 2,
          });
        }
      }
    }

    setConnections(result);
  }, [periodos, containerRef, enabled]);

  // Compute after first layout
  useEffect(() => {
    const id = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(id);
  }, [compute]);

  // Recompute on resize (debounced 150ms)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(compute, 150);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [containerRef, compute]);

  return connections;
}
