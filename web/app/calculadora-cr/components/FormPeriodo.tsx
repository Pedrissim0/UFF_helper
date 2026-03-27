import React, { useCallback, useState } from "react";
import styles from "../CalculadoraCR.module.css";
import type { Disciplina, FormPeriodo as FormPeriodoType } from "../types";
import {
  MATRIZ_OBRIGATORIAS,
  MAX_PERIODO,
  CATALOG_MAP,
  parseSem,
  computeSemestrePorPeriodo,
} from "../types";
import { useCalculadoraStore } from "@/stores/useCalculadoraStore";

interface FormPeriodoProps {
  aberto: boolean;
  disciplinas: Disciplina[];
  onClose: () => void;
  onWidgetExpand: () => void;
}

export default function FormPeriodo({
  aberto,
  disciplinas,
  onClose,
  onWidgetExpand,
}: FormPeriodoProps) {
  const calcStore = useCalculadoraStore();
  const [formPeriodo, setFormPeriodo] = useState<FormPeriodoType>({
    periodo: 1,
    semestreIngresso: "",
  });

  const periodoIngressoValido = parseSem(formPeriodo.semestreIngresso).year > 0;

  const handlePreencher = useCallback(() => {
    const { year: entryYear, num: entryNum } = parseSem(formPeriodo.semestreIngresso);
    const toAdd: Disciplina[] = [];
    for (let p = 1; p <= formPeriodo.periodo; p++) {
      const discsDoPeriodo = MATRIZ_OBRIGATORIAS.filter((d) => d.periodo === p);
      const isCurrentPeriodo = p === formPeriodo.periodo;
      const semestre =
        entryYear && entryNum ? computeSemestrePorPeriodo(entryYear, entryNum, p) : "";

      for (const md of discsDoPeriodo) {
        if (
          disciplinas.some((d) => d.codigo === md.codigo) ||
          toAdd.some((d) => d.codigo === md.codigo)
        )
          continue;
        const cat = CATALOG_MAP[md.codigo];
        toAdd.push({
          codigo: md.codigo,
          nome: md.nome,
          situacao: "Aprovado",
          turma: "",
          nota: null,
          vs: null,
          frequencia: null,
          horas: cat?.ch ?? 60,
          creditos: 0,
          semestre,
          isProjecao: isCurrentPeriodo,
        });
      }
    }
    calcStore.setDisciplinas([...disciplinas, ...toAdd]);
    onClose();
    onWidgetExpand();
  }, [formPeriodo, disciplinas, calcStore, onClose, onWidgetExpand]);

  if (!aberto) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pré-preencher por período"
    >
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitulo}>Pré-preencher por período</span>
          <button className={styles.modalFechar} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalDesc}>
            Adiciona todas as disciplinas obrigatórias da grade curricular até o período
            selecionado. Disciplinas já na lista são ignoradas.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Semestre de ingresso</label>
            <input
              className={styles.formInput}
              value={formPeriodo.semestreIngresso}
              onChange={(e) =>
                setFormPeriodo((f) => ({ ...f, semestreIngresso: e.target.value }))
              }
              placeholder="2022.1"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Período atual</label>
            <select
              className={styles.formSelect}
              value={formPeriodo.periodo}
              onChange={(e) =>
                setFormPeriodo((f) => ({ ...f, periodo: parseInt(e.target.value) }))
              }
            >
              {Array.from({ length: MAX_PERIODO }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  {p}º período
                </option>
              ))}
            </select>
          </div>

          <p className={styles.modalHint}>
            As disciplinas do período atual serão marcadas como <strong>projeção</strong>.
            Preencha as notas de cada disciplina depois de adicionadas.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancelar} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.btnSalvar}
            onClick={handlePreencher}
            disabled={!periodoIngressoValido}
            title={
              !periodoIngressoValido
                ? "Informe o semestre de ingresso (ex: 2022.1)"
                : undefined
            }
          >
            Pré-preencher
          </button>
        </div>
      </div>
    </div>
  );
}
