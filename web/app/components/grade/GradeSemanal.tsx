import React from "react";
import type { Materia } from "../../grade/page";
import styles from "../GradeHoraria.module.css";
import { DIAS, DIAS_LABEL, HOUR_MARKS, toPercent, parseTime } from "./types";

interface GradeSemanalProps {
  selecionadas: Materia[];
  colorMap: Record<string, string>;
  showLegenda: boolean;
}

export default function GradeSemanal({
  selecionadas,
  colorMap,
  showLegenda,
}: GradeSemanalProps) {
  return (
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
                    className={`${styles.bloco} ${!showLegenda ? styles.blocoExpanded : ""}`}
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
                    {!showLegenda && m.nome_exibicao && (
                      <div className={styles.blocoProf}>{m.nome_exibicao}</div>
                    )}
                    <div className={styles.blocoTurma}>T. {m.turma}</div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
