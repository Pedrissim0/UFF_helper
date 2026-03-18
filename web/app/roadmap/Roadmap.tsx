"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Link from "next/link";
import styles from "./Roadmap.module.css";
import curriculoRaw from "@/data/curriculo.json";
import { useUIStore } from "@/stores/useUIStore";
import { useDisciplinasStore } from "@/stores/useDisciplinasStore";
import {
  useRoadmapConnections,
  type PeriodoData,
  type DisciplinaData,
} from "@/hooks/useRoadmapConnections";
import {
  calcularColunas,
  calcularTotalColunas,
} from "@/lib/calcularColunas";
import { formatarNomeDisciplina } from "@/lib/formatarNomeDisciplina";
import { calcularEstadoDisciplina } from "@/lib/calcularEstadoDisciplina";

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
  const chObrig = periodo.disciplinas.reduce(
    (s, d) => s + d.carga_horaria,
    0
  );
  return Math.max(0, 360 - chObrig);
}

// Build SVG arrow path
function buildArrowPath(c: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): string {
  if (Math.abs(c.y1 - c.y2) < 4) {
    return `M${c.x1},${c.y1} L${c.x2},${c.y2}`;
  }
  const midX = (c.x1 + c.x2) / 2;
  return `M${c.x1},${c.y1} H${midX} V${c.y2} H${c.x2}`;
}

export default function Roadmap() {
  const { tema, toggleTema, _hydrateTheme } = useUIStore();
  const aprovadas = useDisciplinasStore((s) => s.aprovadas);

  const containerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const [hoveredCodigo, setHoveredCodigo] = useState<string | null>(null);
  const [selectedDisc, setSelectedDisc] = useState<DisciplinaData | null>(
    null
  );
  const [tappedCodigo, setTappedCodigo] = useState<string | null>(null);

  const connections = useRoadmapConnections(
    periodos,
    containerRef,
    !isMobile
  );

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
    if (!selectedDisc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDisc(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedDisc]);

  const approvedSet = useMemo(() => new Set(aprovadas), [aprovadas]);

  const approvedCount = useMemo(
    () =>
      periodos
        .flatMap((p) => p.disciplinas)
        .filter((d) => approvedSet.has(d.codigo)).length,
    [approvedSet]
  );

  // Highlight chain: hovered + prereqs + direct dependents
  const activeHighlight = useMemo<Set<string> | null>(() => {
    const code = hoveredCodigo ?? tappedCodigo;
    if (!code) return null;
    const set = new Set<string>([code]);
    const disc = discMap.get(code);
    if (disc) {
      for (const p of disc.pre_requisitos) set.add(p);
    }
    const deps = dependentsMap.get(code);
    if (deps) {
      for (const d of deps) set.add(d);
    }
    return set;
  }, [hoveredCodigo, tappedCodigo]);

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
          setSelectedDisc((prev) =>
            prev?.codigo === disc.codigo ? null : disc
          );
          setTappedCodigo(null);
        } else {
          setTappedCodigo(disc.codigo);
        }
      } else {
        setSelectedDisc((prev) =>
          prev?.codigo === disc.codigo ? null : disc
        );
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
    TOTAL_OBRIGATORIAS > 0
      ? (approvedCount / TOTAL_OBRIGATORIAS) * 100
      : 0;

  const numPeriodos = periodos.length;

  // ── Render a discipline card ──
  const renderDiscCard = (
    disc: DisciplinaData,
    gridPlacement?: React.CSSProperties
  ) => {
    const estado = calcularEstadoDisciplina(
      disc.codigo,
      disc.pre_requisitos,
      aprovadas
    );
    const inHighlight =
      activeHighlight === null || activeHighlight.has(disc.codigo);
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
            setSelectedDisc((prev) =>
              prev?.codigo === disc.codigo ? null : disc
            );
          }
        }}
        aria-pressed={isSelected}
        aria-label={formatarNomeDisciplina(disc.nome)}
      >
        <span className={styles.discNome}>
          {formatarNomeDisciplina(disc.nome)}
        </span>
        <span className={styles.discCodigo}>{disc.codigo}</span>
        <div className={styles.discMeta}>
          <span className={styles.discBadge}>{disc.carga_horaria}h</span>
        </div>
        {isMobile && prereqNames.length > 0 && (
          <span className={styles.mobilePrereq}>
            Req: {prereqNames.join(" · ")}
          </span>
        )}
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
          <Link href="/" className={styles.navLink}>
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
            aria-label={
              tema === "light" ? "Ativar modo noturno" : "Ativar modo claro"
            }
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
          <div
            className={styles.progressFill}
            style={{ width: `${progressPct}%` }}
          />
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
                  <div className={styles.periodHeader}>
                    {periodo.label}
                  </div>
                  <div className={styles.mobileCards}>
                    {periodo.disciplinas.map((disc) =>
                      renderDiscCard(disc)
                    )}
                    {chOpt > 60 && (
                      <div className={styles.discOptativasCard}>
                        <span className={styles.discNome}>Optativas</span>
                        <span className={styles.discOptSep} />
                        <span className={styles.discOptCH}>
                          {chOpt}h a cumprir
                        </span>
                      </div>
                    )}
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
                      <path
                        d="M0,0 L6,2 L0,4 Z"
                        fill="var(--border-medium)"
                      />
                    </marker>
                    <marker
                      id="roadmap-arrow-active"
                      markerWidth="6"
                      markerHeight="4"
                      refX="5"
                      refY="2"
                      orient="auto"
                    >
                      <path
                        d="M0,0 L6,2 L0,4 Z"
                        fill="var(--accent)"
                      />
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
                        className={
                          isActive
                            ? styles.arrowActive
                            : styles.arrowIdle
                        }
                        fill="none"
                        markerEnd={
                          isActive
                            ? "url(#roadmap-arrow-active)"
                            : "url(#roadmap-arrow)"
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

                {/* Empty cells for alignment */}
                {periodos.map((periodo, colIdx) => {
                  const usedRows = new Set(
                    periodo.disciplinas.map(
                      (d) => rowMap.get(d.codigo) ?? 0
                    )
                  );
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

                {/* Optativas cards */}
                {periodos.map((periodo, colIdx) => {
                  const ch = getChOptativas(periodo);
                  if (ch <= 60) return null;
                  return (
                    <div
                      key={`opt-${periodo.numero}`}
                      className={styles.discOptativasCard}
                      style={{
                        gridColumn: colIdx + 1,
                        gridRow: maxRows + 2,
                      }}
                      aria-label={`${ch}h de optativas neste período`}
                    >
                      <span className={styles.discNome}>Optativas</span>
                      <span className={styles.discOptSep} />
                      <span className={styles.discOptCH}>
                        {ch}h a cumprir
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Detail modal / bottom sheet ── */}
      {selectedDisc && (
        <div
          className={styles.modalBackdrop}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes de ${formatarNomeDisciplina(selectedDisc.nome)}`}
        >
          <div
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              onClick={handleCloseModal}
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

            <h2 className={styles.modalNome}>
              {formatarNomeDisciplina(selectedDisc.nome)}
            </h2>
            <p className={styles.modalCodigo}>{selectedDisc.codigo}</p>

            <div className={styles.modalMeta}>
              <span className={styles.modalCH}>
                {selectedDisc.carga_horaria}h
              </span>
              {(() => {
                const estado = calcularEstadoDisciplina(
                  selectedDisc.codigo,
                  selectedDisc.pre_requisitos,
                  aprovadas
                );
                if (estado === "aprovado")
                  return (
                    <span
                      className={`${styles.badge} ${styles.badgeAprovado}`}
                    >
                      Aprovado
                    </span>
                  );
                if (estado === "desbloqueado")
                  return (
                    <span
                      className={`${styles.badge} ${styles.badgeDesbloqueado}`}
                    >
                      Desbloqueado
                    </span>
                  );
                if (estado === "bloqueado")
                  return (
                    <span
                      className={`${styles.badge} ${styles.badgeBloqueado}`}
                    >
                      Bloqueado
                    </span>
                  );
                return null;
              })()}
            </div>

            {selectedDisc.pre_requisitos.length > 0 ? (
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Pré-requisitos</h3>
                <ul className={styles.modalPrereqList}>
                  {selectedDisc.pre_requisitos.map((code) => {
                    const d = discMap.get(code);
                    const isAprov = approvedSet.has(code);
                    return (
                      <li key={code} className={styles.modalPrereqItem}>
                        <span
                          className={
                            isAprov
                              ? styles.modalPrereqDone
                              : styles.modalPrereqPending
                          }
                          aria-label={isAprov ? "Aprovado" : "Pendente"}
                        >
                          {isAprov ? "✓" : "○"}
                        </span>
                        <span className={styles.modalPrereqNome}>
                          {d ? formatarNomeDisciplina(d.nome) : code}
                        </span>
                        <span className={styles.modalPrereqCode}>
                          {code}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className={styles.modalSection}>
                <p className={styles.modalNoPrereq}>
                  Sem pré-requisitos — disponível a qualquer momento.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
