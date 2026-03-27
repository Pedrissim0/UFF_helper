import React, { useCallback, useState } from "react";
import styles from "../CalculadoraCR.module.css";
import type { Disciplina, CatalogItem } from "../types";
import { CATALOG, CATALOG_MAP, normalizeSem } from "../types";
import { isAprovadoOuEquivalente } from "@/stores/useDisciplinasStore";
import { useCalculadoraStore } from "@/stores/useCalculadoraStore";

interface ModalProjecaoProps {
  aberto: boolean;
  disciplinas: Disciplina[];
  onClose: () => void;
  onWidgetExpand: () => void;
}

export default function ModalProjecao({
  aberto,
  disciplinas,
  onClose,
  onWidgetExpand,
}: ModalProjecaoProps) {
  const calcStore = useCalculadoraStore();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [semestre, setSemestre] = useState("");
  const [sugestoes, setSugestoes] = useState<CatalogItem[]>([]);
  const [sugestaoVisivel, setSugestaoVisivel] = useState(false);

  const handleClose = useCallback(() => {
    setSelecionadas(new Set());
    setBusca("");
    setSugestoes([]);
    setSugestaoVisivel(false);
    onClose();
  }, [onClose]);

  const handleAdicionar = useCallback(() => {
    if (selecionadas.size === 0) return;
    const semNorm = normalizeSem(semestre);
    const toAdd: Disciplina[] = [];
    for (const cod of Array.from(selecionadas)) {
      if (
        disciplinas.some(
          (d) => d.codigo === cod && (isAprovadoOuEquivalente(d.situacao) || d.isProjecao)
        ) ||
        toAdd.some((d) => d.codigo === cod)
      )
        continue;
      const cat = CATALOG_MAP[cod];
      toAdd.push({
        codigo: cod,
        nome: cat?.nome ?? cod,
        situacao: "Aprovado",
        turma: "",
        nota: 10,
        vs: null,
        frequencia: null,
        horas: cat?.ch ?? 60,
        creditos: 0,
        semestre: semNorm,
        isProjecao: true,
      });
    }
    calcStore.setDisciplinas([...disciplinas, ...toAdd]);
    onWidgetExpand();
    handleClose();
  }, [selecionadas, semestre, disciplinas, calcStore, onWidgetExpand, handleClose]);

  if (!aberto) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar projeção"
    >
      <div
        className={styles.modalCard}
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <span className={styles.modalTitulo}>Adicionar projeção</span>
          <button
            className={styles.modalFechar}
            onClick={handleClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Adicionar disciplina</label>
            <div className={styles.autocompleteWrap}>
              <input
                className={styles.formInput}
                value={busca}
                onChange={(e) => {
                  const val = e.target.value;
                  setBusca(val);
                  if (val.length >= 2) {
                    const lower = val.toLowerCase();
                    const found = CATALOG.filter(
                      (d) =>
                        !selecionadas.has(d.codigo) &&
                        !disciplinas.some(
                          (ex) =>
                            ex.codigo === d.codigo && isAprovadoOuEquivalente(ex.situacao)
                        ) &&
                        (d.nome.toLowerCase().includes(lower) ||
                          d.codigo.toLowerCase().includes(lower))
                    ).slice(0, 8);
                    setSugestoes(found);
                    setSugestaoVisivel(found.length > 0);
                  } else {
                    setSugestoes([]);
                    setSugestaoVisivel(false);
                  }
                }}
                onFocus={() => sugestoes.length > 0 && setSugestaoVisivel(true)}
                onBlur={() => setTimeout(() => setSugestaoVisivel(false), 150)}
                placeholder="Buscar por nome ou código..."
                autoFocus
                autoComplete="off"
              />
              {sugestaoVisivel && sugestoes.length > 0 && (
                <div className={styles.sugestoesDropdown}>
                  {sugestoes.map((s) => (
                    <button
                      key={s.codigo}
                      className={styles.sugestaoItem}
                      onMouseDown={() => {
                        setSelecionadas((prev) => {
                          const next = new Set(Array.from(prev));
                          next.add(s.codigo);
                          return next;
                        });
                        setBusca("");
                        setSugestoes([]);
                        setSugestaoVisivel(false);
                      }}
                      type="button"
                    >
                      <span className={styles.sugestaoNome}>{s.nome}</span>
                      <span className={styles.sugestaoCodigo}>
                        {s.codigo} · {s.ch}h
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selecionadas.size > 0 && (
            <div className={styles.projecaoChips}>
              {Array.from(selecionadas).map((cod) => {
                const cat = CATALOG_MAP[cod];
                return (
                  <div key={cod} className={styles.projecaoChip}>
                    <span className={styles.projecaoChipNome}>{cat?.nome ?? cod}</span>
                    <button
                      className={styles.projecaoChipRemove}
                      onClick={() =>
                        setSelecionadas((prev) => {
                          const next = new Set(Array.from(prev));
                          next.delete(cod);
                          return next;
                        })
                      }
                      type="button"
                      aria-label={`Remover ${cat?.nome ?? cod}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Semestre da projeção</label>
            <input
              className={styles.formInput}
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
              placeholder="2025.1"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          {selecionadas.size > 0 && (
            <span className={styles.projecaoContagem}>
              {selecionadas.size} selecionada(s)
            </span>
          )}
          <button className={styles.btnCancelar} onClick={handleClose}>
            Cancelar
          </button>
          <button
            className={styles.btnSalvarProjecao}
            onClick={handleAdicionar}
            disabled={selecionadas.size === 0}
          >
            Adicionar
            {selecionadas.size > 0 ? ` (${selecionadas.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
