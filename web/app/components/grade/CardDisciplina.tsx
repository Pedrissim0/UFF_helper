import React from "react";
import type { Materia } from "../../grade/page";
import styles from "../GradeHoraria.module.css";
import ProfTag from "../ProfTag";
import { DIAS, DIAS_LABEL } from "./types";

interface CardDisciplinaProps {
  materia: Materia;
  selecionada: boolean;
  conflito: boolean;
  aprovada: boolean;
  color: string;
  nomeCompleto: string;
  confirmedEmail?: string;
  alreadySubmittedEmail: boolean;
  difficultyAvg?: number;
  difficultyCount?: number;
  difficultySubmitted: boolean;
  onToggle: () => void;
  onSuggestEmail: () => void;
  onContributeDifficulty: () => void;
  onCopyProf: () => void;
}

export default function CardDisciplina({
  materia: m,
  selecionada: sel,
  conflito,
  aprovada,
  color,
  nomeCompleto,
  confirmedEmail,
  alreadySubmittedEmail,
  difficultyAvg,
  difficultyCount,
  difficultySubmitted,
  onToggle,
  onSuggestEmail,
  onContributeDifficulty,
  onCopyProf,
}: CardDisciplinaProps) {
  const diasAtivos = DIAS.filter((d) => m.horarios[d]);

  return (
    <li
      className={[
        styles.item,
        sel ? styles.itemSel : "",
        conflito ? styles.itemConflito : "",
        aprovada ? styles.itemAprovado : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => !conflito && !aprovada && onToggle()}
    >
      <div
        className={styles.checkbox}
        style={sel ? { background: color, borderColor: color } : undefined}
      >
        {sel && <span className={styles.checkmark}>✓</span>}
      </div>

      <div className={styles.itemInfo}>
        <div className={styles.itemNomeRow}>
          <span className={styles.itemNome}>{m.nome}</span>
          {m.nome_exibicao && (
            <ProfTag
              nomeExibicao={m.nome_exibicao}
              nomeCompleto={nomeCompleto}
              confirmedEmail={confirmedEmail}
              alreadySubmitted={alreadySubmittedEmail}
              onSuggestEmail={onSuggestEmail}
              codigoDisciplina={m.codigo}
              difficultyAvg={difficultyAvg}
              difficultyCount={difficultyCount}
              difficultySubmitted={difficultySubmitted}
              onContributeDifficulty={onContributeDifficulty}
              onCopy={onCopyProf}
            />
          )}
        </div>
        <div className={styles.itemMetaWrapper}>
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
          <span className={styles.tipoBadge}>
            {m.tipo === "obrigatoria" ? "Obrigatória" : "Optativa"}
          </span>
          {aprovada && <span className={styles.tipoBadgeAprovado}>Aprovado</span>}
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
}
