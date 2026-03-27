import React from "react";
import type { Materia } from "../../grade/page";
import styles from "../GradeHoraria.module.css";

interface LegendaProps {
  selecionadas: Materia[];
  colorMap: Record<string, string>;
}

export default function Legenda({ selecionadas, colorMap }: LegendaProps) {
  if (selecionadas.length === 0) return null;

  return (
    <div className={styles.gradeLegenda}>
      {selecionadas.map((m) => {
        const key = `${m.codigo}-${m.turma}`;
        const color = colorMap[key];
        return (
          <div key={key} className={styles.legendaItem}>
            <div className={styles.legendaCor} style={{ background: color }} />
            <div className={styles.legendaTexto}>
              <span className={styles.legendaNome} style={{ color }}>
                {m.nome}
              </span>
              <span className={styles.legendaProf}>{m.nome_exibicao}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
