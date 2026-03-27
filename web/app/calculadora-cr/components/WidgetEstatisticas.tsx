import React, { useCallback, useState } from "react";
import styles from "../CalculadoraCR.module.css";
import { ChartLineIcon, TableIcon } from "./Icons";
import CRChart from "./GraficoHistorico";
import type { Disciplina, HistoricoEntry, WidgetView, AnimDir } from "../types";
import { truncateCR, estaExcluida, HORAS_TOTAIS } from "../types";

interface WidgetEstatisticasProps {
  disciplinas: Disciplina[];
  historico: HistoricoEntry[];
  crAtual: number | null;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export default function WidgetEstatisticas({
  disciplinas,
  historico,
  crAtual,
  expanded,
  onToggleExpanded,
}: WidgetEstatisticasProps) {
  const [widgetView, setWidgetView] = useState<WidgetView>("tabela");
  const [animKey, setAnimKey] = useState(0);
  const [animDir, setAnimDir] = useState<AnimDir>("toChart");

  const toggleView = useCallback(() => {
    setAnimDir((prev) => (prev === "toChart" ? "toTable" : "toChart"));
    setAnimKey((k) => k + 1);
    setWidgetView((v) => (v === "tabela" ? "grafico" : "tabela"));
  }, []);

  const temProjecoes = disciplinas.some((d) => d.isProjecao && !estaExcluida(d));

  const horasCursadas = disciplinas
    .filter(
      (d) =>
        !d.isProjecao &&
        !estaExcluida(d) &&
        (d.situacao.toLowerCase().includes("aprovado") ||
          d.situacao.toLowerCase().includes("aproveitamento"))
    )
    .reduce((sum, d) => sum + d.horas, 0);

  const horasComProjecao = disciplinas
    .filter(
      (d) =>
        !estaExcluida(d) &&
        (d.situacao.toLowerCase().includes("aprovado") ||
          d.situacao.toLowerCase().includes("aproveitamento"))
    )
    .reduce((sum, d) => sum + d.horas, 0);

  const percentualConcluido =
    HORAS_TOTAIS > 0
      ? Math.min(100, Math.round((horasCursadas / HORAS_TOTAIS) * 100))
      : 0;
  const percentualComProjecao =
    HORAS_TOTAIS > 0
      ? Math.min(100, Math.round((horasComProjecao / HORAS_TOTAIS) * 100))
      : 0;

  const animClass =
    animDir === "toChart" ? styles.animSlideFromLeft : styles.animSlideFromRight;

  if (disciplinas.length === 0) return null;

  return (
    <div
      className={[
        styles.widgetOuter,
        expanded ? styles.widgetOuterExpanded : styles.widgetOuterCollapsed,
      ].join(" ")}
    >
      <div
        className={styles.widgetTab}
        onClick={onToggleExpanded}
        role="button"
        aria-label={expanded ? "Recolher widget" : "Expandir widget"}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggleExpanded()}
      >
        <span className={styles.widgetTabText}>Histórico CR</span>
      </div>

      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <span className={styles.widgetTitulo}>Histórico CR</span>
          <div className={styles.widgetHeaderActions}>
            <button
              className={styles.widgetViewToggle}
              onClick={toggleView}
              title={widgetView === "tabela" ? "Ver gráfico" : "Ver tabela"}
              aria-label={
                widgetView === "tabela" ? "Alternar para gráfico" : "Alternar para tabela"
              }
            >
              {widgetView === "tabela" ? <ChartLineIcon /> : <TableIcon />}
            </button>
            <button
              className={styles.widgetFechar}
              onClick={onToggleExpanded}
              aria-label="Recolher widget"
              title="Recolher"
            >
              ×
            </button>
          </div>
        </div>

        {crAtual !== null && (
          <div className={styles.crDestaque}>
            <span className={styles.crDestaqueLabel}>CR Atual</span>
            <span className={styles.crDestaqueValor}>{truncateCR(crAtual)}</span>
          </div>
        )}

        <div className={styles.widgetStats}>
          <div className={styles.widgetStat}>
            <span className={styles.widgetStatLabel}>Horas cursadas</span>
            <span
              className={[
                styles.widgetStatValor,
                temProjecoes ? styles.widgetStatProjecao : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {temProjecoes ? horasComProjecao : horasCursadas}
              <span className={styles.widgetStatTotal}> / {HORAS_TOTAIS}h</span>
            </span>
          </div>
          <div className={styles.widgetStat}>
            <span className={styles.widgetStatLabel}>Curso concluído</span>
            <span
              className={[
                styles.widgetStatValor,
                temProjecoes ? styles.widgetStatProjecao : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {temProjecoes ? percentualComProjecao : percentualConcluido}%
            </span>
          </div>
        </div>

        <div className={styles.widgetBody}>
          {historico.length === 0 ? (
            <p className={styles.widgetVazio}>
              Preencha os semestres das disciplinas para calcular o CR.
            </p>
          ) : widgetView === "tabela" ? (
            <div key={`tabela-${animKey}`} className={animClass}>
              <table className={styles.widgetTabela}>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>CR acumulado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((entry, i) => (
                    <tr
                      key={i}
                      className={[
                        i === historico.length - 1 ? styles.crUltimo : "",
                        entry.temProjecao ? styles.crProjecao : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td>{entry.periodo}</td>
                      <td>{truncateCR(entry.cr)}</td>
                      <td className={styles.widgetTabelaTagCell}>
                        {entry.temProjecao && (
                          <span className={styles.tagProjecao}>Projetado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              key={`grafico-${animKey}`}
              className={`${styles.chartWrap} ${animClass}`}
            >
              <CRChart historico={historico} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
