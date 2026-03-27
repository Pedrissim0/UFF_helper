import React from "react";
import styles from "../GradeHoraria.module.css";
import type { Dia, Turno } from "./types";
import { DIAS, DIAS_LABEL, TURNOS, toggleSet } from "./types";
import { useGradeStore } from "@/stores/useGradeStore";

interface FiltrosDisciplinasProps {
  aberto: boolean;
  aprovadas: Set<string>;
  diasFiltro: Set<Dia>;
  setDiasFiltro: React.Dispatch<React.SetStateAction<Set<Dia>>>;
  turnosFiltro: Set<Turno>;
  setTurnosFiltro: React.Dispatch<React.SetStateAction<Set<Turno>>>;
  deptosFiltro: Set<string>;
  setDeptosFiltro: React.Dispatch<React.SetStateAction<Set<string>>>;
  periodosFiltro: Set<string>;
  setPeriodosFiltro: React.Dispatch<React.SetStateAction<Set<string>>>;
  tipoFiltro: "obrigatoria" | "optativa" | null;
  setTipoFiltro: React.Dispatch<React.SetStateAction<"obrigatoria" | "optativa" | null>>;
  departamentos: { depto: string; count: number }[];
  periodos: number[];
}

export default function FiltrosDisciplinas({
  aberto,
  aprovadas,
  diasFiltro,
  setDiasFiltro,
  turnosFiltro,
  setTurnosFiltro,
  deptosFiltro,
  setDeptosFiltro,
  periodosFiltro,
  setPeriodosFiltro,
  tipoFiltro,
  setTipoFiltro,
  departamentos,
  periodos,
}: FiltrosDisciplinasProps) {
  const gradeStore = useGradeStore();

  return (
    <div className={`${styles.filtroPanel} ${aberto ? styles.filtroPanelAberto : ""}`}>
      {aprovadas.size > 0 && (
        <div className={styles.filtroGrupo}>
          <span className={styles.filtroLabel}>Cursado</span>
          <div className={styles.filtroChips}>
            <button
              className={`${styles.filtroChip} ${gradeStore.jaCursadoFiltro === "nao" ? styles.filtroChipAtivo : ""}`}
              onClick={() =>
                gradeStore.setJaCursadoFiltro(
                  gradeStore.jaCursadoFiltro === "nao" ? null : "nao"
                )
              }
            >
              Não
            </button>
            <button
              className={`${styles.filtroChip} ${gradeStore.jaCursadoFiltro === "sim" ? styles.filtroChipAtivo : ""}`}
              onClick={() =>
                gradeStore.setJaCursadoFiltro(
                  gradeStore.jaCursadoFiltro === "sim" ? null : "sim"
                )
              }
            >
              Sim
            </button>
          </div>
        </div>
      )}

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
        <span className={styles.filtroLabel}>Período</span>
        <div className={styles.filtroChips}>
          {periodos.map((p) => (
            <button
              key={p}
              className={`${styles.filtroChip} ${periodosFiltro.has(String(p)) ? styles.filtroChipAtivo : ""}`}
              onClick={() => setPeriodosFiltro((prev) => toggleSet(prev, String(p)))}
            >
              {p}°
            </button>
          ))}
          <button
            className={`${styles.filtroChip} ${periodosFiltro.has("np") ? styles.filtroChipAtivo : ""}`}
            onClick={() => setPeriodosFiltro((prev) => toggleSet(prev, "np"))}
          >
            Não Periodizada
          </button>
        </div>
      </div>

      <div className={styles.filtroGrupo}>
        <span className={styles.filtroLabel}>Tipo</span>
        <div className={styles.filtroChips}>
          <button
            className={`${styles.filtroChip} ${tipoFiltro === "obrigatoria" ? styles.filtroChipAtivo : ""}`}
            onClick={() =>
              setTipoFiltro((prev) => (prev === "obrigatoria" ? null : "obrigatoria"))
            }
          >
            Obrigatória
          </button>
          <button
            className={`${styles.filtroChip} ${tipoFiltro === "optativa" ? styles.filtroChipAtivo : ""}`}
            onClick={() =>
              setTipoFiltro((prev) => (prev === "optativa" ? null : "optativa"))
            }
          >
            Optativa
          </button>
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
  );
}
