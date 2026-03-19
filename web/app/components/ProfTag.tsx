"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./ProfTag.module.css";

interface ProfTagProps {
  nomeExibicao: string;
  nomeCompleto?: string;
  confirmedEmail?: string;
  alreadySubmitted?: boolean;
  onSuggestEmail?: () => void;
  onCopy?: () => void;
  codigoDisciplina?: string;
  difficultyAvg?: number;
  difficultyCount?: number;
  difficultySubmitted?: boolean;
  onContributeDifficulty?: () => void;
}

const TOOLTIP_WIDTH = 240;
const TOOLTIP_GAP = 6;

export default function ProfTag({
  nomeExibicao,
  nomeCompleto,
  confirmedEmail,
  alreadySubmitted,
  onSuggestEmail,
  onCopy,
  codigoDisciplina,
  difficultyAvg,
  difficultyCount,
  difficultySubmitted,
  onContributeDifficulty,
}: ProfTagProps) {
  const docente = nomeCompleto || nomeExibicao;
  const isProfAllocated = docente !== "Sem professor alocado";

  const tagRef = useRef<HTMLSpanElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const computePos = useCallback(() => {
    if (!tagRef.current) return null;
    const rect = tagRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: align right edge of tooltip to right edge of tag, clamp to viewport
    let left = rect.right - TOOLTIP_WIDTH;
    left = Math.max(8, Math.min(left, vw - TOOLTIP_WIDTH - 8));

    // Vertical: prefer below, fall back to above
    const spaceBelow = vh - rect.bottom;
    const top = spaceBelow >= 140
      ? rect.bottom + TOOLTIP_GAP
      : rect.top - TOOLTIP_GAP - 140;

    return { top, left };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      setPos(computePos());
    }, 400);
  }, [computePos]);

  const handleMouseLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setPos(null), 100);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const hasDifficulty = difficultyCount !== undefined && difficultyCount > 0 && difficultyAvg !== undefined;
  const showDifficultyCta = isProfAllocated && codigoDisciplina && onContributeDifficulty;

  const tooltip = pos && mounted ? createPortal(
    <div
      className={styles.profTooltip}
      style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>Nome</span>
        <span className={styles.tooltipValue}>{docente}</span>
      </div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>Email</span>
        {confirmedEmail ? (
          <span className={styles.tooltipEmail}>{confirmedEmail}</span>
        ) : isProfAllocated && onSuggestEmail ? (
          <span
            className={styles.tooltipEmailCta}
            onClick={(e) => {
              e.stopPropagation();
              if (!alreadySubmitted) onSuggestEmail();
            }}
          >
            {alreadySubmitted ? "Sugestão registrada" : "você sabe o email? Digite aqui"}
          </span>
        ) : (
          <span className={styles.tooltipEmailNone}>—</span>
        )}
      </div>

      {/* Difficulty CTA row */}
      {showDifficultyCta && (
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>Dificuldade</span>
          <span
            className={styles.tooltipEmailCta}
            onClick={(e) => {
              e.stopPropagation();
              if (!difficultySubmitted) onContributeDifficulty();
            }}
          >
            {difficultySubmitted ? "Voto registrado ✓" : "Avalie aqui"}
          </span>
        </div>
      )}

      {/* Difficulty bar (below rows) */}
      {hasDifficulty && (
        <div className={styles.difficultySection}>
          <div className={styles.difficultyLabels}>
            <span className={styles.difficultyLabelLeft}>Mamata</span>
            <span className={styles.difficultyLabelRight}>Não pegue</span>
          </div>
          <div className={styles.difficultyTrack}>
            <div
              className={styles.difficultyMarker}
              style={{ left: `${(difficultyAvg! / 5) * 100}%` }}
            />
          </div>
          <span className={styles.difficultyCount}>({difficultyCount} {difficultyCount === 1 ? "voto" : "votos"})</span>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className={styles.profWrapper} onClick={(e) => e.stopPropagation()}>
      <span
        ref={tagRef}
        className={styles.profTag}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          if (onCopy) onCopy();
        }}
      >
        Prof. {nomeExibicao}
      </span>
      {tooltip}
    </div>
  );
}
