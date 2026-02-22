"use client";

import { useState, useMemo } from "react";
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
const MAX_TIME = 23 * 60;
const TOTAL = MAX_TIME - MIN_TIME;
const HOUR_MARKS = [8, 10, 12, 14, 16, 18, 20, 22];

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
  const [isHovering, setIsHovering] = useState(false);
  const [filtrosAberto, setFiltrosAberto] = useState(false);
  const [diasFiltro, setDiasFiltro] = useState<Set<Dia>>(new Set());
  const [turnosFiltro, setTurnosFiltro] = useState<Set<Turno>>(new Set());
  const [deptosFiltro, setDeptosFiltro] = useState<Set<string>>(new Set());
  const [profsFiltro, setProfsFiltro] = useState<Set<string>>(new Set());

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

  const professores = useMemo(() => {
    const set = new Set<string>();
    materias.forEach((m) => { if (m.professor) set.add(m.professor); });
    return Array.from(set).sort();
  }, [materias]);

  const activeFilterCount = diasFiltro.size + turnosFiltro.size + deptosFiltro.size + profsFiltro.size;

  const filtradas = useMemo(() => {
    let result = materias;

    const q = busca.toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          m.codigo.toLowerCase().includes(q) ||
          m.turma.toLowerCase().includes(q)
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

    if (profsFiltro.size > 0) {
      result = result.filter((m) => profsFiltro.has(m.professor));
    }

    return result;
  }, [busca, materias, diasFiltro, turnosFiltro, deptosFiltro]);

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

  const totalHoras = selecionadas.reduce((acc, m) => acc + m.modulo, 0);
  const expanded = selecionadas.length > 0 || isHovering;
  const handleLabel =
    selecionadas.length > 0
      ? `📅 ${selecionadas.length} mat. · ${totalHoras}h`
      : "📅 Grade";

  return (
    <div className={styles.wrapper}>
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
            placeholder="Buscar por nome, código ou turma..."
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

          {professores.length > 0 && (
            <div className={styles.filtroGrupo}>
              <span className={styles.filtroLabel}>Prof.</span>
              <div className={`${styles.filtroChips} ${styles.filtroChipsScroll}`}>
                {professores.map((prof) => (
                  <button
                    key={prof}
                    className={`${styles.filtroChip} ${profsFiltro.has(prof) ? styles.filtroChipAtivo : ""}`}
                    onClick={() => setProfsFiltro((prev) => toggleSet(prev, prof))}
                  >
                    {prof}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          {filtradas.map((m) => {
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
                      {m.nome.length > 36 ? m.nome.slice(0, 36) + "…" : m.nome}
                    </span>
                    {m.professor && (
                      <span className={styles.profTag}>{m.professor}</span>
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
                      <span>{m.modulo}h</span>
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
        </ul>
      </div>

      {/* Floating grade widget */}
      <div
        className={styles.widget}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Grade content — animates in/out */}
        <div
          className={`${styles.gradeContent} ${expanded ? styles.gradeContentExpanded : ""}`}
        >
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
                          className={styles.bloco}
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
                            {m.nome.split(" ").slice(0, 3).join(" ")}
                          </div>
                          <div className={styles.blocoTurma}>T. {m.turma}</div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Handle — always visible */}
        <div
          className={styles.handle}
          onClick={() => setIsHovering((h) => !h)}
        >
          {handleLabel}
        </div>
      </div>
    </div>
  );
}
