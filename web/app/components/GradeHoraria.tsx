"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Materia } from "../page";
import styles from "./GradeHoraria.module.css";

type Dia = keyof Materia["horarios"];
type Turno = "manha" | "tarde" | "noite";

const DIAS: Dia[] = ["seg", "ter", "qua", "qui", "sex", "sab"];
const DIAS_LABEL: Record<Dia, string> = {
  seg: "SEG",
  ter: "TER",
  qua: "QUA",
  qui: "QUI",
  sex: "SEX",
  sab: "SÁB",
};

const TURNOS: { key: Turno; label: string }[] = [
  { key: "manha", label: "Manhã" },
  { key: "tarde", label: "Tarde" },
  { key: "noite", label: "Noite" },
];

function toggleSet<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set);
  if (next.has(val)) next.delete(val);
  else next.add(val);
  return next;
}

function getStartMin(horario: string): number | null {
  if (!horario) return null;
  const match = horario.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

const PALETTE = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#0ea5e9", "#f97316", "#14b8a6", "#ec4899", "#84cc16",
];

const MIN_TIME = 7 * 60;
const MAX_TIME = 24 * 60;
const TOTAL = MAX_TIME - MIN_TIME;
const HOUR_MARKS = [8, 10, 12, 14, 16, 18, 20, 22, 23];

function parseTime(str: string): { start: number; end: number; label: string } | null {
  if (!str) return null;
  const [startStr, endStr] = str.split("-");
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return { start: toMin(startStr), end: toMin(endStr), label: str };
}

function toPercent(min: number) {
  return ((min - MIN_TIME) / TOTAL) * 100;
}

interface Props {
  materias: Materia[];
}

export default function GradeHoraria({ materias }: Props) {
  const [busca, setBusca] = useState("");
  const [selecionadas, setSelecionadas] = useState<Materia[]>([]);
  const [gradeAberta, setGradeAberta] = useState(false);
  const [filtrosAberto, setFiltrosAberto] = useState(false);
  const [diasFiltro, setDiasFiltro] = useState<Set<Dia>>(new Set());
  const [turnosFiltro, setTurnosFiltro] = useState<Set<Turno>>(new Set());
  const [deptosFiltro, setDeptosFiltro] = useState<Set<string>>(new Set());
  const [widgetPos, setWidgetPos] = useState<'center' | 'left' | 'right'>('center');
  const [widgetWidth, setWidgetWidth] = useState(500);
  const [copiado, setCopiado] = useState(false);
  const [legendaVisivel, setLegendaVisivel] = useState(true);
  const resizingRef = useRef(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isLateral = widgetPos === 'left' || widgetPos === 'right';
  const showLegenda = legendaVisivel && selecionadas.length > 0;

  const handleCopiar = useCallback(() => {
    const text = selecionadas.map((m) => {
      const horarios = DIAS
        .filter((d) => m.horarios[d])
        .map((d) => `${d}: ${m.horarios[d]}`)
        .join(", ");
      return `${m.codigo} - ${m.nome} - Turma ${m.turma} - ${horarios}`;
    }).join("\n");
    navigator.clipboard.writeText(text);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [selecionadas]);

  const handleExportarPDF = useCallback(() => {
    window.print();
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    const startX = e.clientX;
    const startWidth = widgetWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = widgetPos === 'right'
        ? startX - ev.clientX
        : ev.clientX - startX;
      const newWidth = Math.max(360, Math.min(window.innerWidth * 0.6, startWidth + delta));
      setWidgetWidth(newWidth);
    };

    const onMouseUp = () => {
      resizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [widgetWidth, widgetPos]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let i = 0;
    materias.forEach((m) => {
      const key = `${m.codigo}-${m.turma}`;
      if (!map[key]) map[key] = PALETTE[i++ % PALETTE.length];
    });
    return map;
  }, [materias]);

  const departamentos = useMemo(() => {
    const counts: Record<string, number> = {};
    materias.forEach((m) => {
      const depto = m.codigo.replace(/[0-9]/g, "");
      counts[depto] = (counts[depto] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([depto, count]) => ({ depto, count }));
  }, [materias]);

  const activeFilterCount = diasFiltro.size + turnosFiltro.size + deptosFiltro.size;

  const filtradas = useMemo(() => {
    let result = materias;

    const q = busca.toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          m.codigo.toLowerCase().includes(q) ||
          m.turma.toLowerCase().includes(q) ||
          m.professor.toLowerCase().includes(q)
      );
    }

    if (diasFiltro.size > 0) {
      result = result.filter((m) =>
        DIAS.some((d) => diasFiltro.has(d) && m.horarios[d])
      );
    }

    if (turnosFiltro.size > 0) {
      result = result.filter((m) => {
        for (const dia of DIAS) {
          const start = getStartMin(m.horarios[dia]);
          if (start === null) continue;
          if (turnosFiltro.has("manha") && start < 720) return true;
          if (turnosFiltro.has("tarde") && start >= 720 && start < 1080) return true;
          if (turnosFiltro.has("noite") && start >= 1080) return true;
        }
        return false;
      });
    }

    if (deptosFiltro.size > 0) {
      result = result.filter((m) => {
        const depto = m.codigo.replace(/[0-9]/g, "");
        return deptosFiltro.has(depto);
      });
    }

    return result;
  }, [busca, materias, diasFiltro, turnosFiltro, deptosFiltro]);

  // Agrupa materias filtradas por periodo
  const periodoGroups = useMemo(() => {
    const groups: Map<number | null, Materia[]> = new Map();
    filtradas.forEach((m) => {
      const key = m.periodo;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === null && b === null) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        return a - b;
      })
      .map(([periodo, materias]) => ({ periodo, materias }));
  }, [filtradas]);

  function isSelecionada(m: Materia) {
    return selecionadas.some((s) => s.codigo === m.codigo && s.turma === m.turma);
  }

  function temConflito(candidata: Materia) {
    for (const dia of DIAS) {
      const t1 = parseTime(candidata.horarios[dia]);
      if (!t1) continue;
      for (const s of selecionadas) {
        if (s.codigo === candidata.codigo && s.turma === candidata.turma) continue;
        const t2 = parseTime(s.horarios[dia]);
        if (!t2) continue;
        if (t1.start < t2.end && t1.end > t2.start) return true;
      }
    }
    return false;
  }

  function toggle(m: Materia) {
    if (isSelecionada(m)) {
      setSelecionadas((prev) =>
        prev.filter((s) => !(s.codigo === m.codigo && s.turma === m.turma))
      );
    } else {
      setSelecionadas((prev) => [...prev, m]);
    }
  }

  const totalHoras = selecionadas.reduce((acc, m) => acc + (m.ch ?? 0), 0);
  const expanded = gradeAberta;
  const handleLabel =
    selecionadas.length > 0
      ? `📅 ${selecionadas.length} mat. · ${totalHoras}h`
      : "📅 Grade";

  const widgetPosClass =
    widgetPos === 'center' ? styles.widget_center
    : widgetPos === 'left' ? styles.widget_left
    : styles.widget_right;

  return (
    <div
      className={styles.wrapper}
      style={isLateral && expanded && !isMobile ? {
        paddingRight: widgetPos === 'right' ? widgetWidth + 16 : undefined,
        paddingLeft: widgetPos === 'left' ? widgetWidth + 16 : undefined,
      } : undefined}
    >
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.semestre}>ECONOMIA · 2026.1</span>
        <h1 className={styles.titulo}>Montador de Grade</h1>
      </header>

      {/* Full-width content */}
      <div className={styles.content}>
        <div className={styles.buscaRow}>
          <input
            className={styles.busca}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, código, turma ou professor..."
          />
          <button
            className={`${styles.filtroToggle} ${filtrosAberto ? styles.filtroToggleAberto : ""}`}
            onClick={() => setFiltrosAberto(!filtrosAberto)}
          >
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <span className={styles.chevron}>▾</span>
          </button>
        </div>

        {/* Filter panel — collapsible */}
        <div className={`${styles.filtroPanel} ${filtrosAberto ? styles.filtroPanelAberto : ""}`}>
          <div className={styles.filtroGrupo}>
            <span className={styles.filtroLabel}>Dia</span>
            <div className={styles.filtroChips}>
              {DIAS.map((d) => (
                <button
                  key={d}
                  className={`${styles.filtroChip} ${diasFiltro.has(d) ? styles.filtroChipAtivo : ""}`}
                  onClick={() => setDiasFiltro((prev) => toggleSet(prev, d))}
                >
                  {DIAS_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filtroGrupo}>
            <span className={styles.filtroLabel}>Turno</span>
            <div className={styles.filtroChips}>
              {TURNOS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`${styles.filtroChip} ${turnosFiltro.has(key) ? styles.filtroChipAtivo : ""}`}
                  onClick={() => setTurnosFiltro((prev) => toggleSet(prev, key))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filtroGrupo}>
            <span className={styles.filtroLabel}>Depto</span>
            <div className={styles.filtroChips}>
              {departamentos.map(({ depto, count }) => (
                <button
                  key={depto}
                  className={`${styles.filtroChip} ${deptosFiltro.has(depto) ? styles.filtroChipAtivo : ""}`}
                  onClick={() => setDeptosFiltro((prev) => toggleSet(prev, depto))}
                >
                  {depto} ({count})
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className={styles.statusBar}>
          <span className={styles.statusTxt}>
            {filtradas.length} turmas · {selecionadas.length} selecionadas
          </span>
          {selecionadas.length > 0 && (
            <button className={styles.limpar} onClick={() => setSelecionadas([])}>
              Limpar
            </button>
          )}
        </div>

        <ul className={styles.lista}>
          {periodoGroups.map(({ periodo, materias }) => (
            <React.Fragment key={periodo ?? "sem"}>
              <li className={styles.periodSeparator}>
                {periodo ? `${periodo}° Período` : "Optativas"}
              </li>
              {materias.map((m) => {
            const key = `${m.codigo}-${m.turma}`;
            const sel = isSelecionada(m);
            const conflito = !sel && temConflito(m);
            const color = colorMap[key];
            const diasAtivos = DIAS.filter((d) => m.horarios[d]);

            return (
              <li
                key={key}
                className={`${styles.item} ${sel ? styles.itemSel : ""} ${conflito ? styles.itemConflito : ""}`}
                onClick={() => !conflito && toggle(m)}
              >
                <div
                  className={styles.checkbox}
                  style={sel ? { background: color, borderColor: color } : undefined}
                >
                  {sel && <span className={styles.checkmark}>✓</span>}
                </div>

                <div className={styles.itemInfo}>
                  <div className={styles.itemNomeRow}>
                    <span className={styles.itemNome}>
                      {m.nome}
                    </span>
                    <span
                      className={`${styles.tipoBadge} ${
                        m.tipo === "obrigatoria"
                          ? styles.tipoBadgeObrigatoria
                          : styles.tipoBadgeOptativa
                      }`}
                    >
                      {m.tipo === "obrigatoria" ? "Obrig." : "Opt."}
                    </span>
                    {m.professor && (
                      <span className={styles.profTag}>Prof. {m.professor}</span>
                    )}
                  </div>
                  <div className={styles.itemMeta}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>Cód.</span>
                      <span>{m.codigo}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>Turma</span>
                      <span>{m.turma}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>CH</span>
                      <span>{m.ch != null ? `${m.ch}h` : "—"}</span>
                    </div>
                    {diasAtivos.map((d) => (
                      <div key={d} className={styles.metaRow}>
                        <span className={styles.metaKey}>{DIAS_LABEL[d]}</span>
                        <span>{m.horarios[d]}</span>
                      </div>
                    ))}
                  </div>
                  {m.link && (
                    <a
                      href={m.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.itemLinkBtn}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver no quadro de horários ↗
                    </a>
                  )}
                </div>
              </li>
            );
              })}
            </React.Fragment>
          ))}
        </ul>
      </div>

      {/* Floating grade widget */}
      <div
        className={`${styles.widget} ${widgetPosClass} ${!expanded ? styles.widgetCollapsed : styles.widgetExpanded}`}
        style={isLateral ? { width: widgetWidth } : undefined}
      >
        {/* Resize handle for lateral mode */}
        {isLateral && (
          <div
            className={`${styles.resizeHandle} ${widgetPos === 'left' ? styles.resizeHandleRight : styles.resizeHandleLeft}`}
            onMouseDown={handleResizeStart}
          />
        )}

        {/* Handle — always visible */}
        <div
          className={styles.handle}
          onClick={() => setGradeAberta((prev) => !prev)}
        >
          {handleLabel}
          <span className={styles.handleSpacer} />
          {selecionadas.length > 0 && (
            <div className={styles.actionBtns}>
              <button
                className={`${styles.posBtn} ${legendaVisivel ? styles.posBtnAtivo : ''}`}
                onClick={(e) => { e.stopPropagation(); setLegendaVisivel((v) => !v); }}
                aria-label={legendaVisivel ? "Ocultar legenda" : "Exibir legenda"}
                title={legendaVisivel ? "Ocultar legenda" : "Exibir legenda"}
              >
                {legendaVisivel ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
              <button
                className={styles.posBtn}
                onClick={(e) => { e.stopPropagation(); handleCopiar(); }}
                aria-label="Copiar grade"
                title="Copiar grade"
              >
                {copiado ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
              <button
                className={styles.posBtn}
                onClick={(e) => { e.stopPropagation(); handleExportarPDF(); }}
                aria-label="Imprimir grade"
                title="Imprimir grade"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          )}
          <div className={styles.posBtns}>
            <button
              className={`${styles.posBtn} ${widgetPos === 'left' ? styles.posBtnAtivo : ''}`}
              onClick={(e) => { e.stopPropagation(); setWidgetPos('left'); }}
              aria-label="Mover para esquerda"
            >←</button>
            <button
              className={`${styles.posBtn} ${widgetPos === 'center' ? styles.posBtnAtivo : ''}`}
              onClick={(e) => { e.stopPropagation(); setWidgetPos('center'); }}
              aria-label="Centralizar"
            >·</button>
            <button
              className={`${styles.posBtn} ${widgetPos === 'right' ? styles.posBtnAtivo : ''}`}
              onClick={(e) => { e.stopPropagation(); setWidgetPos('right'); }}
              aria-label="Mover para direita"
            >→</button>
          </div>
        </div>

        {/* Grade content — animates in/out */}
        <div
          className={`${styles.gradeContent} ${expanded ? styles.gradeContentExpanded : ""}`}
        >
          <div className={styles.gradeInner}>
            <div className={styles.grade}>
              <div className={styles.gradeHeader}>
                <div className={styles.eixoSpacer} />
                {DIAS.map((d) => (
                  <div key={d} className={styles.diaHeader}>
                    {DIAS_LABEL[d]}
                  </div>
                ))}
              </div>

              <div className={styles.gradeCols}>
                <div className={styles.eixo}>
                  {HOUR_MARKS.map((h) => (
                    <div
                      key={h}
                      className={styles.horaLabel}
                      style={{ top: `${toPercent(h * 60)}%` }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                {DIAS.map((dia) => (
                  <div key={dia} className={styles.coluna}>
                    {HOUR_MARKS.map((h) => (
                      <div
                        key={h}
                        className={styles.linhaHora}
                        style={{ top: `${toPercent(h * 60)}%` }}
                      />
                    ))}

                    {selecionadas
                      .filter((m) => m.horarios[dia])
                      .map((m) => {
                        const key = `${m.codigo}-${m.turma}`;
                        const time = parseTime(m.horarios[dia]);
                        if (!time) return null;
                        const top = toPercent(time.start);
                        const height = toPercent(time.end) - top;
                        const color = colorMap[key];
                        return (
                          <div
                            key={key}
                            className={`${styles.bloco} ${!showLegenda ? styles.blocoExpanded : ''}`}
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                              background: color + "18",
                              borderLeftColor: color,
                              color,
                            }}
                          >
                            <div className={styles.blocoHora}>{time.label}</div>
                            <div className={styles.blocoNome}>
                              {showLegenda ? m.nome.split(" ").slice(0, 3).join(" ") : m.nome}
                            </div>
                            {!showLegenda && m.professor && (
                              <div className={styles.blocoProf}>{m.professor}</div>
                            )}
                            <div className={styles.blocoTurma}>T. {m.turma}</div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            {showLegenda && (
              <div className={styles.gradeLegenda}>
                {selecionadas.map((m) => {
                  const key = `${m.codigo}-${m.turma}`;
                  const color = colorMap[key];
                  return (
                    <div key={key} className={styles.legendaItem}>
                      <div className={styles.legendaCor} style={{ background: color }} />
                      <div className={styles.legendaTexto}>
                        <span className={styles.legendaNome} style={{ color }}>{m.nome}</span>
                        <span className={styles.legendaProf}>{m.professor}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
