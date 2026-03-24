"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import styles from "./Roadmap.module.css";
import curriculoRaw from "@/data/curriculo.json";
import allDisciplinas from "@/data/db_disciplinas.json";
import { useUIStore } from "@/stores/useUIStore";
import { useDisciplinasStore } from "@/stores/useDisciplinasStore";
import { useCalculadoraStore } from "@/stores/useCalculadoraStore";
import { isAprovadoOuEquivalente } from "@/stores/useDisciplinasStore";
import {
  useRoadmapConnections,
  type PeriodoData,
  type DisciplinaData,
} from "@/hooks/useRoadmapConnections";
import { calcularColunas, calcularTotalColunas } from "@/lib/calcularColunas";
import { formatarNomeDisciplina } from "@/lib/formatarNomeDisciplina";
import { calcularEstadoDisciplina } from "@/lib/calcularEstadoDisciplina";
import DisciplineDetailModal from "./DisciplineDetailModal";
import type { FilesMap, ProfessorsPerDiscMap } from "@/types/discipline-files";

const periodos = curriculoRaw.periodos as PeriodoData[];

// Row assignment: each discipline gets a row index so chains align horizontally
const rowMap = calcularColunas(periodos);
const maxRows = calcularTotalColunas(rowMap);

// Lookup tables (static)
const discMap = new Map<string, DisciplinaData>();
for (const p of periodos) {
  for (const d of p.disciplinas) {
    discMap.set(d.codigo, d);
  }
}

// Reverse dependency map: codigo → dependents
const dependentsMap = new Map<string, string[]>();
for (const p of periodos) {
  for (const d of p.disciplinas) {
    for (const prereq of d.pre_requisitos) {
      const arr = dependentsMap.get(prereq);
      if (arr) arr.push(d.codigo);
      else dependentsMap.set(prereq, [d.codigo]);
    }
  }
}

const TOTAL_OBRIGATORIAS = periodos
  .flatMap((p) => p.disciplinas)
  .filter((d) => d.obrigatoria).length;

function getChOptativas(periodo: PeriodoData): number {
  const chObrig = periodo.disciplinas.reduce((s, d) => s + d.carga_horaria, 0);
  return Math.max(0, 360 - chObrig);
}

// Deduplicated optativas from db_disciplinas.json
interface OptativaInfo {
  codigo: string;
  nome: string;
  ch: number;
  prerequisitos: string[];
}
const optativasDisponiveis: OptativaInfo[] = (() => {
  const seen = new Set<string>();
  const result: OptativaInfo[] = [];
  for (const d of allDisciplinas as Array<{
    codigo: string;
    nome: string;
    ch: number;
    tipo: string;
    prerequisitos?: string[];
  }>) {
    if (d.tipo === "optativa" && !seen.has(d.codigo)) {
      seen.add(d.codigo);
      result.push({
        codigo: d.codigo,
        nome: d.nome,
        ch: d.ch,
        prerequisitos: d.prerequisitos ?? [],
      });
    }
  }
  return result.sort((a, b) => a.nome.localeCompare(b.nome));
})();

// Build lookup for optativas by codigo
const optMap = new Map<string, OptativaInfo>();
for (const o of optativasDisponiveis) {
  optMap.set(o.codigo, o);
  // Register in discMap so modal prereq list can resolve optativa names
  if (!discMap.has(o.codigo)) {
    discMap.set(o.codigo, {
      codigo: o.codigo,
      nome: o.nome,
      carga_horaria: o.ch,
      obrigatoria: false,
      pre_requisitos: o.prerequisitos,
    });
  }
  // Also register in dependentsMap so hovering obrigatórias highlights dependent optativas
  for (const prereq of o.prerequisitos) {
    const arr = dependentsMap.get(prereq);
    if (arr) {
      if (!arr.includes(o.codigo)) arr.push(o.codigo);
    } else dependentsMap.set(prereq, [o.codigo]);
  }
}

// Build SVG arrow path
function buildArrowPath(c: { x1: number; y1: number; x2: number; y2: number }): string {
  if (Math.abs(c.y1 - c.y2) < 4) {
    return `M${c.x1},${c.y1} L${c.x2},${c.y2}`;
  }
  const midX = (c.x1 + c.x2) / 2;
  return `M${c.x1},${c.y1} H${midX} V${c.y2} H${c.x2}`;
}

interface RoadmapProps {
  initialFilesMap?: FilesMap;
  professorsPerDisc?: ProfessorsPerDiscMap;
}

export default function Roadmap({
  initialFilesMap = {},
  professorsPerDisc = {},
}: RoadmapProps) {
  const { tema, toggleTema, _hydrateTheme } = useUIStore();
  const aprovadas = useDisciplinasStore((s) => s.aprovadas);

  const containerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const [hoveredCodigo, setHoveredCodigo] = useState<string | null>(null);
  const [selectedDisc, setSelectedDisc] = useState<DisciplinaData | null>(null);
  const [tappedCodigo, setTappedCodigo] = useState<string | null>(null);

  // Optativas selection
  const [optModalPeriodo, setOptModalPeriodo] = useState<number | null>(null);
  const [selectedOptativas, setSelectedOptativas] = useState<Record<number, string[]>>(
    {}
  );
  const [optBusca, setOptBusca] = useState("");

  useEffect(() => {
    _hydrateTheme();
  }, [_hydrateTheme]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSvgSize({ w: 0, h: 0 });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      if (!containerRef.current) return;
      setSvgSize({ w: el.offsetWidth, h: el.offsetHeight });
    };
    // Defer initial measurement to ensure grid is laid out
    requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  // Close modal on Escape
  useEffect(() => {
    if (!selectedDisc && optModalPeriodo === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (optModalPeriodo !== null) {
          setOptModalPeriodo(null);
          setOptBusca("");
        } else {
          setSelectedDisc(null);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedDisc, optModalPeriodo]);

  const approvedSet = useMemo(() => new Set(aprovadas), [aprovadas]);

  const approvedCount = useMemo(
    () =>
      periodos.flatMap((p) => p.disciplinas).filter((d) => approvedSet.has(d.codigo))
        .length,
    [approvedSet]
  );

  // Approved optativas from Calculadora de CR
  const calcDisciplinas = useCalculadoraStore((s) => s.disciplinas);
  const approvedOptativas = useMemo<OptativaInfo[]>(() => {
    const seen = new Set<string>();
    const result: OptativaInfo[] = [];
    for (const d of calcDisciplinas) {
      if (
        isAprovadoOuEquivalente(d.situacao) &&
        !d.isProjecao &&
        optMap.has(d.codigo) &&
        !seen.has(d.codigo)
      ) {
        seen.add(d.codigo);
        result.push(optMap.get(d.codigo)!);
      }
    }
    return result;
  }, [calcDisciplinas]);

  const approvedOptSet = useMemo(
    () => new Set(approvedOptativas.map((o) => o.codigo)),
    [approvedOptativas]
  );

  // Empty rows per period (for placing optativas in vacant slots)
  const emptyRowsByPeriod = useMemo(() => {
    const map: Record<number, number[]> = {};
    periodos.forEach((periodo) => {
      const usedRows = new Set(periodo.disciplinas.map((d) => rowMap.get(d.codigo) ?? 0));
      map[periodo.numero] = Array.from({ length: maxRows }, (_, r) => r).filter(
        (r) => !usedRows.has(r)
      );
    });
    return map;
  }, []);

  // Auto-distribute approved optativas across periods by CH capacity
  const approvedOptByPeriod = useMemo<Record<number, OptativaInfo[]>>(() => {
    const map: Record<number, OptativaInfo[]> = {};
    const queue = [...approvedOptativas];
    for (const p of periodos) {
      const chTarget = getChOptativas(p);
      if (chTarget <= 60) continue;
      map[p.numero] = [];
      // Fill this period until its CH target is reached
      let filled = 0;
      while (queue.length > 0 && filled < chTarget) {
        const next = queue.shift()!;
        map[p.numero].push(next);
        filled += next.ch;
      }
    }
    // If still remaining, add to last period with slots
    if (queue.length > 0) {
      const lastPeriodo = [...periodos].reverse().find((p) => getChOptativas(p) > 60);
      if (lastPeriodo) {
        if (!map[lastPeriodo.numero]) map[lastPeriodo.numero] = [];
        map[lastPeriodo.numero].push(...queue);
      }
    }
    return map;
  }, [approvedOptativas]);

  // Merge selected + approved optativas into periodos so the hook computes their arrows
  const periodosWithOptativas = useMemo<PeriodoData[]>(() => {
    return periodos.map((p) => {
      const selCodigos = selectedOptativas[p.numero] ?? [];
      const aprovOpts = approvedOptByPeriod[p.numero] ?? [];
      const allCodigos = [...selCodigos, ...aprovOpts.map((o) => o.codigo)];
      if (allCodigos.length === 0) return p;
      const extraDiscs: DisciplinaData[] = allCodigos
        .map((c) => {
          const o = optMap.get(c);
          if (!o) return null;
          return {
            codigo: o.codigo,
            nome: o.nome,
            carga_horaria: o.ch,
            obrigatoria: false,
            pre_requisitos: o.prerequisitos,
          } as DisciplinaData;
        })
        .filter(Boolean) as DisciplinaData[];
      return { ...p, disciplinas: [...p.disciplinas, ...extraDiscs] };
    });
  }, [selectedOptativas, approvedOptByPeriod]);

  const connections = useRoadmapConnections(
    periodosWithOptativas,
    containerRef,
    !isMobile
  );

  // Highlight chain: hovered + prereqs + direct dependents (obrigatórias + optativas)
  const activeHighlight = useMemo<Set<string> | null>(() => {
    const code = hoveredCodigo ?? tappedCodigo;
    if (!code) return null;
    const set = new Set<string>([code]);
    // Check obrigatória prereqs
    const disc = discMap.get(code);
    if (disc) {
      for (const p of disc.pre_requisitos) set.add(p);
    }
    // Check optativa prereqs
    const opt = optMap.get(code);
    if (opt) {
      for (const p of opt.prerequisitos) set.add(p);
    }
    // Check dependents (includes both obrigatórias and optativas)
    const deps = dependentsMap.get(code);
    if (deps) {
      for (const d of deps) set.add(d);
    }
    return set;
  }, [hoveredCodigo, tappedCodigo]);

  // All optativas already selected across all periods
  const allSelectedCodigos = useMemo(() => {
    const set = new Set<string>();
    for (const codigos of Object.values(selectedOptativas)) {
      for (const c of codigos) set.add(c);
    }
    return set;
  }, [selectedOptativas]);

  // Filtered optativas for the modal (exclude approved obrigatórias, approved optativas, and already selected)
  const optativasFiltradas = useMemo(() => {
    if (optModalPeriodo === null) return [];
    const busca = optBusca.toLowerCase().trim();
    return optativasDisponiveis.filter((o) => {
      if (approvedSet.has(o.codigo)) return false;
      if (approvedOptSet.has(o.codigo)) return false;
      if (allSelectedCodigos.has(o.codigo)) return false;
      if (
        busca &&
        !o.nome.toLowerCase().includes(busca) &&
        !o.codigo.toLowerCase().includes(busca)
      )
        return false;
      return true;
    });
  }, [optModalPeriodo, optBusca, approvedSet, approvedOptSet, allSelectedCodigos]);

  // Optativas selected for the currently open modal period
  const optativasNoPeriodo = useMemo(() => {
    if (optModalPeriodo === null) return [];
    const codigos = selectedOptativas[optModalPeriodo] ?? [];
    return codigos
      .map((c) => optativasDisponiveis.find((o) => o.codigo === c))
      .filter(Boolean) as OptativaInfo[];
  }, [optModalPeriodo, selectedOptativas]);

  // Empty rows per period (for placing optativas in vacant slots)
  // Drag state
  const [dragCodigo, setDragCodigo] = useState<string | null>(null);
  const [dragOverPeriodo, setDragOverPeriodo] = useState<number | null>(null);

  const handleOpenOptModal = useCallback((periodo: number) => {
    setOptModalPeriodo(periodo);
    setOptBusca("");
  }, []);

  const handleCloseOptModal = useCallback(() => {
    setOptModalPeriodo(null);
    setOptBusca("");
  }, []);

  const handleToggleOptativa = useCallback(
    (codigo: string) => {
      if (optModalPeriodo === null) return;
      setSelectedOptativas((prev) => {
        const current = prev[optModalPeriodo] ?? [];
        const has = current.includes(codigo);
        return {
          ...prev,
          [optModalPeriodo]: has
            ? current.filter((c) => c !== codigo)
            : [...current, codigo],
        };
      });
    },
    [optModalPeriodo]
  );

  const handleRemoveOptativa = useCallback((periodo: number, codigo: string) => {
    setSelectedOptativas((prev) => {
      const current = prev[periodo] ?? [];
      return {
        ...prev,
        [periodo]: current.filter((c) => c !== codigo),
      };
    });
  }, []);

  // Drag & drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, codigo: string, fromPeriodo: number) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ codigo, fromPeriodo }));
      e.dataTransfer.effectAllowed = "move";
      setDragCodigo(codigo);
      document.body.classList.add("dragging-active");
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDragCodigo(null);
    setDragOverPeriodo(null);
    document.body.classList.remove("dragging-active");
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, periodoNum: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverPeriodo(periodoNum);
  }, []);

  const handleColumnDragLeave = useCallback(() => {
    setDragOverPeriodo(null);
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, toPeriodo: number) => {
    e.preventDefault();
    setDragOverPeriodo(null);
    setDragCodigo(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { codigo, fromPeriodo } = data as { codigo: string; fromPeriodo: number };
      if (fromPeriodo === toPeriodo) return;
      setSelectedOptativas((prev) => {
        const fromList = (prev[fromPeriodo] ?? []).filter((c) => c !== codigo);
        const toList = [...(prev[toPeriodo] ?? []), codigo];
        return { ...prev, [fromPeriodo]: fromList, [toPeriodo]: toList };
      });
    } catch {
      /* ignore invalid drag data */
    }
  }, []);

  const handleMouseEnter = useCallback((codigo: string) => {
    if (window.matchMedia("(pointer: fine)").matches) {
      setHoveredCodigo(codigo);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCodigo(null);
  }, []);

  const handleCardClick = useCallback(
    (e: React.MouseEvent, disc: DisciplinaData) => {
      e.stopPropagation();
      if (isMobile) {
        if (tappedCodigo === disc.codigo) {
          setSelectedDisc((prev) => (prev?.codigo === disc.codigo ? null : disc));
          setTappedCodigo(null);
        } else {
          setTappedCodigo(disc.codigo);
        }
      } else {
        setSelectedDisc((prev) => (prev?.codigo === disc.codigo ? null : disc));
      }
    },
    [isMobile, tappedCodigo]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedDisc(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setTappedCodigo(null);
    setHoveredCodigo(null);
  }, []);

  const progressPct =
    TOTAL_OBRIGATORIAS > 0 ? (approvedCount / TOTAL_OBRIGATORIAS) * 100 : 0;

  const numPeriodos = periodos.length;

  // ── Render a discipline card ──
  const renderDiscCard = (disc: DisciplinaData, gridPlacement?: React.CSSProperties) => {
    const estado = calcularEstadoDisciplina(disc.codigo, disc.pre_requisitos, aprovadas);
    const inHighlight = activeHighlight === null || activeHighlight.has(disc.codigo);
    const isSelected = selectedDisc?.codigo === disc.codigo;

    const cardClasses = [
      styles.discCard,
      styles[`disc_${estado}`] ?? "",
      !inHighlight ? styles.discDimmed : "",
      isSelected ? styles.discSelected : "",
    ]
      .filter(Boolean)
      .join(" ");

    const prereqNames = isMobile
      ? disc.pre_requisitos.map((code) => {
          const d = discMap.get(code);
          return d ? formatarNomeDisciplina(d.nome) : code;
        })
      : [];

    return (
      <div
        key={disc.codigo}
        data-codigo={disc.codigo}
        className={cardClasses}
        style={gridPlacement}
        onMouseEnter={() => handleMouseEnter(disc.codigo)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => handleCardClick(e, disc)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedDisc((prev) => (prev?.codigo === disc.codigo ? null : disc));
          }
        }}
        aria-pressed={isSelected}
        aria-label={formatarNomeDisciplina(disc.nome)}
      >
        <span className={styles.discNome}>{formatarNomeDisciplina(disc.nome)}</span>
        <span className={styles.discCodigo}>{disc.codigo}</span>
        <div className={styles.discMeta}>
          <span className={styles.discBadge}>{disc.carga_horaria}h</span>
        </div>
        {isMobile && prereqNames.length > 0 && (
          <span className={styles.mobilePrereq}>Req: {prereqNames.join(" · ")}</span>
        )}
      </div>
    );
  };

  // Convert OptativaInfo → DisciplinaData for modal/click reuse
  const optToDisciplina = useCallback(
    (opt: OptativaInfo): DisciplinaData => ({
      codigo: opt.codigo,
      nome: opt.nome,
      carga_horaria: opt.ch,
      obrigatoria: false,
      pre_requisitos: opt.prerequisitos,
    }),
    []
  );

  // ── Render a selected optativa card (purple, draggable, with highlight + click) ──
  const renderOptativaCard = (
    opt: OptativaInfo,
    periodo: number,
    gridPlacement?: React.CSSProperties
  ) => {
    const inHighlight = activeHighlight === null || activeHighlight.has(opt.codigo);
    const isDragging = dragCodigo === opt.codigo;
    const isSelected = selectedDisc?.codigo === opt.codigo;

    const cardClasses = [
      styles.discOptativaSelected,
      !inHighlight ? styles.discDimmed : "",
      isDragging ? styles.discDragging : "",
      isSelected ? styles.discSelected : "",
    ]
      .filter(Boolean)
      .join(" ");

    const disc = optToDisciplina(opt);

    return (
      <div
        key={`opt-sel-${opt.codigo}-${periodo}`}
        data-codigo={opt.codigo}
        className={cardClasses}
        style={gridPlacement}
        draggable
        onDragStart={(e) => handleDragStart(e, opt.codigo, periodo)}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => handleMouseEnter(opt.codigo)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => handleCardClick(e, disc)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedDisc((prev) => (prev?.codigo === opt.codigo ? null : disc));
          }
        }}
        aria-pressed={isSelected}
        aria-label={formatarNomeDisciplina(opt.nome)}
      >
        <span className={styles.discNome}>{formatarNomeDisciplina(opt.nome)}</span>
        <span className={styles.discCodigo}>{opt.codigo}</span>
        <div className={styles.discMeta}>
          <span className={styles.discBadge}>{opt.ch}h</span>
          <button
            className={styles.optRemoveBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveOptativa(periodo, opt.codigo);
            }}
            aria-label={`Remover ${opt.nome}`}
            title="Remover"
          >
            &times;
          </button>
        </div>
      </div>
    );
  };

  // ── Render an approved optativa card (purple + green approved tag) ──
  const renderApprovedOptCard = (
    opt: OptativaInfo,
    gridPlacement?: React.CSSProperties
  ) => {
    const inHighlight = activeHighlight === null || activeHighlight.has(opt.codigo);
    const isSelected = selectedDisc?.codigo === opt.codigo;
    const disc = optToDisciplina(opt);

    const cardClasses = [
      styles.discOptativaSelected,
      styles.discOptApproved,
      !inHighlight ? styles.discDimmed : "",
      isSelected ? styles.discSelected : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        key={`opt-aprov-${opt.codigo}`}
        data-codigo={opt.codigo}
        className={cardClasses}
        style={gridPlacement}
        onMouseEnter={() => handleMouseEnter(opt.codigo)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => handleCardClick(e, disc)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedDisc((prev) => (prev?.codigo === opt.codigo ? null : disc));
          }
        }}
        aria-pressed={isSelected}
        aria-label={formatarNomeDisciplina(opt.nome)}
      >
        <span className={styles.optApprovedTag}>Aprovado</span>
        <span className={styles.discNome}>{formatarNomeDisciplina(opt.nome)}</span>
        <span className={styles.discCodigo}>{opt.codigo}</span>
        <div className={styles.discMeta}>
          <span className={styles.discBadge}>{opt.ch}h</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.wrapper} onClick={handleBackgroundClick}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.semestre}>2026.1 · ECONOMIA · UFF</span>
          <h1 className={styles.titulo}>Roadmap Curricular</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/grade" className={styles.navLink}>
            Grade Horária
          </Link>
          <Link href="/calculadora-cr" className={styles.navLink}>
            Calculadora de CR
          </Link>
          <Link href="/controlador-faltas" className={styles.navLink}>
            Controlador de Faltas
          </Link>
          <button
            className={styles.themeToggle}
            onClick={toggleTema}
            aria-label={tema === "light" ? "Ativar modo noturno" : "Ativar modo claro"}
            title={tema === "light" ? "Modo noturno" : "Modo claro"}
          >
            {tema === "light" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Progress bar ── */}
      {approvedCount > 0 && (
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={approvedCount}
          aria-valuemin={0}
          aria-valuemax={TOTAL_OBRIGATORIAS}
          aria-label={`${approvedCount} de ${TOTAL_OBRIGATORIAS} disciplinas cursadas`}
        >
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          <span className={styles.progressLabel}>
            {approvedCount}/{TOTAL_OBRIGATORIAS} disciplinas cursadas
          </span>
        </div>
      )}

      {/* ── Content ── */}
      <main className={styles.content}>
        {isMobile ? (
          /* ── Mobile: vertical layout ── */
          <div key="mobile" className={styles.mobileContainer}>
            {periodos.map((periodo) => {
              const chOpt = getChOptativas(periodo);
              return (
                <div key={periodo.numero} className={styles.mobilePeriodo}>
                  <div className={styles.periodHeader}>{periodo.label}</div>
                  <div className={styles.mobileCards}>
                    {periodo.disciplinas.map((disc) => renderDiscCard(disc))}
                    {chOpt > 60 &&
                      (() => {
                        const selCodigos = selectedOptativas[periodo.numero] ?? [];
                        const aprovOpts = approvedOptByPeriod[periodo.numero] ?? [];
                        const selCH = selCodigos.reduce((s, c) => {
                          const o = optMap.get(c);
                          return s + (o?.ch ?? 0);
                        }, 0);
                        const aprovCH = aprovOpts.reduce((s, o) => s + o.ch, 0);
                        const restante = Math.max(0, chOpt - selCH - aprovCH);
                        return (
                          <>
                            {/* Approved optativas */}
                            {aprovOpts.map((opt) => renderApprovedOptCard(opt))}
                            {/* User-selected optativas */}
                            {selCodigos.map((codigo) => {
                              const opt = optMap.get(codigo);
                              if (!opt) return null;
                              return renderOptativaCard(opt, periodo.numero);
                            })}
                            {restante > 0 && (
                              <div
                                className={`${styles.discOptativasCard} ${styles.discOptativasClickable}`}
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenOptModal(periodo.numero);
                                }}
                              >
                                <span className={styles.discNome}>Optativas</span>
                                <span className={styles.discOptSep} />
                                <span className={styles.discOptCH}>
                                  {restante}h a cumprir
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Desktop: horizontal grid ── */
          <div key="desktop" className={styles.roadmapScroll}>
            <div ref={containerRef} className={styles.roadmapContainer}>
              {/* SVG arrows overlay */}
              {svgSize.w > 0 && (
                <svg
                  className={styles.connectionsSvg}
                  width={svgSize.w}
                  height={svgSize.h}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="roadmap-arrow"
                      markerWidth="6"
                      markerHeight="4"
                      refX="5"
                      refY="2"
                      orient="auto"
                    >
                      <path d="M0,0 L6,2 L0,4 Z" fill="var(--border-medium)" />
                    </marker>
                    <marker
                      id="roadmap-arrow-active"
                      markerWidth="6"
                      markerHeight="4"
                      refX="5"
                      refY="2"
                      orient="auto"
                    >
                      <path d="M0,0 L6,2 L0,4 Z" fill="var(--accent)" />
                    </marker>
                  </defs>
                  {connections.map((c) => {
                    const isActive =
                      activeHighlight !== null &&
                      activeHighlight.has(c.fromCodigo) &&
                      activeHighlight.has(c.toCodigo);
                    return (
                      <path
                        key={c.id}
                        d={buildArrowPath(c)}
                        className={isActive ? styles.arrowActive : styles.arrowIdle}
                        fill="none"
                        markerEnd={
                          isActive ? "url(#roadmap-arrow-active)" : "url(#roadmap-arrow)"
                        }
                      />
                    );
                  })}
                </svg>
              )}

              <div
                className={styles.roadmapGrid}
                style={{
                  gridTemplateColumns: `repeat(${numPeriodos}, 180px)`,
                  gridTemplateRows: `auto repeat(${maxRows}, 90px) auto`,
                }}
              >
                {/* Period headers */}
                {periodos.map((p, i) => (
                  <div
                    key={`header-${p.numero}`}
                    className={styles.periodHeader}
                    style={{ gridColumn: i + 1, gridRow: 1 }}
                  >
                    {p.label}
                  </div>
                ))}

                {/* Drop zone overlays per column (for drag & drop) */}
                {periodos.map((periodo, colIdx) => {
                  const ch = getChOptativas(periodo);
                  if (ch <= 60) return null;
                  return (
                    <div
                      key={`dropzone-${periodo.numero}`}
                      className={`${styles.dropZone} ${dragOverPeriodo === periodo.numero ? styles.dropZoneActive : ""}`}
                      style={{
                        gridColumn: colIdx + 1,
                        gridRow: `2 / ${maxRows + 2}`,
                      }}
                      onDragOver={(e) => handleColumnDragOver(e, periodo.numero)}
                      onDragLeave={handleColumnDragLeave}
                      onDrop={(e) => handleColumnDrop(e, periodo.numero)}
                      aria-hidden="true"
                    />
                  );
                })}

                {/* Discipline cards */}
                {periodos.map((periodo, colIdx) =>
                  periodo.disciplinas.map((disc) => {
                    const row = rowMap.get(disc.codigo) ?? 0;
                    return renderDiscCard(disc, {
                      gridColumn: colIdx + 1,
                      gridRow: row + 2,
                    });
                  })
                )}

                {/* Selected + approved optativas placed in empty row slots */}
                {periodos.map((periodo, colIdx) => {
                  const selCodigos = selectedOptativas[periodo.numero] ?? [];
                  const aprovOpts = approvedOptByPeriod[periodo.numero] ?? [];
                  const emptyRows = emptyRowsByPeriod[periodo.numero] ?? [];
                  let slotIdx = 0;
                  const cards: React.ReactNode[] = [];
                  // Approved optativas first
                  for (const opt of aprovOpts) {
                    if (slotIdx >= emptyRows.length) break;
                    cards.push(
                      renderApprovedOptCard(opt, {
                        gridColumn: colIdx + 1,
                        gridRow: emptyRows[slotIdx] + 2,
                      })
                    );
                    slotIdx++;
                  }
                  // Then user-selected optativas
                  for (const codigo of selCodigos) {
                    if (slotIdx >= emptyRows.length) break;
                    const opt = optMap.get(codigo);
                    if (!opt) continue;
                    cards.push(
                      renderOptativaCard(opt, periodo.numero, {
                        gridColumn: colIdx + 1,
                        gridRow: emptyRows[slotIdx] + 2,
                      })
                    );
                    slotIdx++;
                  }
                  return cards;
                })}

                {/* Empty cells for remaining vacant slots */}
                {periodos.map((periodo, colIdx) => {
                  const usedRows = new Set(
                    periodo.disciplinas.map((d) => rowMap.get(d.codigo) ?? 0)
                  );
                  // Mark rows used by approved + selected optativas
                  const selCodigos = selectedOptativas[periodo.numero] ?? [];
                  const aprovOpts = approvedOptByPeriod[periodo.numero] ?? [];
                  const emptyRows = emptyRowsByPeriod[periodo.numero] ?? [];
                  const totalUsed = aprovOpts.length + selCodigos.length;
                  for (let i = 0; i < totalUsed && i < emptyRows.length; i++) {
                    usedRows.add(emptyRows[i]);
                  }
                  return Array.from({ length: maxRows }, (_, r) => r)
                    .filter((r) => !usedRows.has(r))
                    .map((r) => (
                      <div
                        key={`empty-${periodo.numero}-${r}`}
                        className={styles.emptyCell}
                        style={{
                          gridColumn: colIdx + 1,
                          gridRow: r + 2,
                        }}
                        aria-hidden="true"
                      />
                    ));
                })}

                {/* Optativas summary card at bottom (hidden when fully covered) */}
                {periodos.map((periodo, colIdx) => {
                  const ch = getChOptativas(periodo);
                  if (ch <= 60) return null;
                  const selCodigos = selectedOptativas[periodo.numero] ?? [];
                  const selCH = selCodigos.reduce((s, c) => {
                    const o = optMap.get(c);
                    return s + (o?.ch ?? 0);
                  }, 0);
                  const aprovCH = (approvedOptByPeriod[periodo.numero] ?? []).reduce(
                    (s, o) => s + o.ch,
                    0
                  );
                  const restante = Math.max(0, ch - selCH - aprovCH);
                  if (restante <= 0) return null;
                  return (
                    <div
                      key={`opt-${periodo.numero}`}
                      className={`${styles.discOptativasCard} ${styles.discOptativasClickable}`}
                      style={{
                        gridColumn: colIdx + 1,
                        gridRow: maxRows + 2,
                      }}
                      aria-label={`${restante}h de optativas neste período — clique para selecionar`}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOptModal(periodo.numero);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenOptModal(periodo.numero);
                        }
                      }}
                    >
                      <span className={styles.discNome}>Optativas</span>
                      <span className={styles.discOptSep} />
                      <span className={styles.discOptCH}>{restante}h a cumprir</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Legend ── */}
      <footer className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendAprovado}`} />
          <span className={styles.legendLabel}>Aprovado</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendDesbloqueado}`} />
          <span className={styles.legendLabel}>Desbloqueado</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendNormal}`} />
          <span className={styles.legendLabel}>Normal</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendBloqueado}`} />
          <span className={styles.legendLabel}>Bloqueado</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendOptativa}`} />
          <span className={styles.legendLabel}>Optativa</span>
        </div>
      </footer>

      {/* ── Detail modal / bottom sheet ── */}
      {selectedDisc && (
        <DisciplineDetailModal
          disc={selectedDisc}
          approvedSet={approvedSet}
          aprovadas={aprovadas}
          files={initialFilesMap[selectedDisc.codigo] ?? []}
          professors={professorsPerDisc[selectedDisc.codigo] ?? []}
          onClose={handleCloseModal}
        />
      )}

      {/* ── Optativas selection modal ── */}
      {optModalPeriodo !== null && (
        <div
          className={styles.modalBackdrop}
          onClick={handleCloseOptModal}
          role="dialog"
          aria-modal="true"
          aria-label={`Selecionar optativas — ${optModalPeriodo}° Período`}
        >
          <div
            className={`${styles.modalPanel} ${styles.optModalPanel}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={handleCloseOptModal}
              aria-label="Fechar"
              title="Fechar"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className={styles.modalNome}>Optativas — {optModalPeriodo}° Período</h2>
            <p className={styles.optModalSub}>
              Selecione as optativas que deseja cursar neste período.
            </p>

            {/* Selected chips */}
            {optativasNoPeriodo.length > 0 && (
              <div className={styles.optChips}>
                {optativasNoPeriodo.map((opt) => (
                  <span key={opt.codigo} className={styles.optChip}>
                    {formatarNomeDisciplina(opt.nome)}
                    <button
                      className={styles.optChipRemove}
                      onClick={() => handleToggleOptativa(opt.codigo)}
                      aria-label={`Remover ${opt.nome}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <input
              className={styles.optSearchInput}
              type="text"
              placeholder="Buscar optativa..."
              value={optBusca}
              onChange={(e) => setOptBusca(e.target.value)}
              autoFocus
            />

            {/* List */}
            <ul className={styles.optList}>
              {optativasFiltradas.map((opt) => (
                <li
                  key={opt.codigo}
                  className={styles.optItem}
                  onClick={() => handleToggleOptativa(opt.codigo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleOptativa(opt.codigo);
                    }
                  }}
                >
                  <span className={styles.optItemNome}>
                    {formatarNomeDisciplina(opt.nome)}
                  </span>
                  <span className={styles.optItemMeta}>
                    <span className={styles.optItemCodigo}>{opt.codigo}</span>
                    <span className={styles.optItemCH}>{opt.ch}h</span>
                  </span>
                </li>
              ))}
              {optativasFiltradas.length === 0 && (
                <li className={styles.optEmpty}>Nenhuma optativa encontrada.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
