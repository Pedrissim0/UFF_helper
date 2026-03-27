import React, { useCallback, useRef, useState } from "react";
import styles from "../CalculadoraCR.module.css";
import type { FormState, ModalState, Disciplina, CatalogItem } from "../types";
import {
  CATALOG,
  CATALOG_MAP,
  SITUACOES,
  FORM_VAZIO,
  clampNota,
  normalizeSem,
  parseNum,
} from "../types";
import { isAprovadoOuEquivalente } from "@/stores/useDisciplinasStore";
import { useCalculadoraStore } from "@/stores/useCalculadoraStore";

interface ModalDisciplinaProps {
  modal: ModalState;
  disciplinas: Disciplina[];
  onClose: () => void;
  onWidgetExpand: () => void;
}

export default function ModalDisciplina({
  modal,
  disciplinas,
  onClose,
  onWidgetExpand,
}: ModalDisciplinaProps) {
  const calcStore = useCalculadoraStore();
  const buscaRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [sugestoes, setSugestoes] = useState<CatalogItem[]>([]);
  const [sugestaoVisivel, setSugestaoVisivel] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const resetAndOpen = useCallback(
    (m: ModalState) => {
      if (!m.aberto) return;
      if (m.tipo === "editando") {
        const d = disciplinas[m.index];
        setForm({
          busca: d.nome,
          codigo: d.codigo,
          nome: d.nome,
          situacao: SITUACOES.includes(d.situacao) ? d.situacao : "Aprovado",
          nota: d.nota !== null ? String(d.nota) : "",
          vs: d.vs !== null ? String(d.vs) : "",
          horas: String(d.horas),
          semestre: d.semestre,
        });
      } else {
        setForm(FORM_VAZIO);
      }
      setSugestoes([]);
      setSugestaoVisivel(false);
      setErroModal(null);
      setTimeout(() => buscaRef.current?.focus(), 50);
    },
    [disciplinas]
  );

  // Re-initialize form when modal changes
  React.useEffect(() => {
    if (modal.aberto) resetAndOpen(modal);
  }, [modal, resetAndOpen]);

  const handleBuscaChange = useCallback(
    (value: string) => {
      setForm((f) => ({ ...f, busca: value, nome: value }));
      setErroModal(null);
      if (value.length >= 2) {
        const lower = value.toLowerCase();
        const found = CATALOG.filter(
          (d) =>
            !disciplinas.some(
              (ex) => ex.codigo === d.codigo && isAprovadoOuEquivalente(ex.situacao)
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
    },
    [disciplinas]
  );

  const handleSelecionarSugestao = useCallback((item: CatalogItem) => {
    setForm((f) => ({
      ...f,
      busca: item.nome,
      codigo: item.codigo,
      nome: item.nome,
      horas: String(item.ch),
    }));
    setSugestaoVisivel(false);
    setErroModal(null);
  }, []);

  const handleSalvar = useCallback(() => {
    const nomeResolvido = form.nome || form.busca;
    if (!nomeResolvido && !form.codigo) return;

    const novaDisc: Disciplina = {
      codigo: form.codigo,
      nome: nomeResolvido,
      situacao: form.situacao,
      turma: "",
      nota: parseNum(form.nota),
      vs: parseNum(form.vs),
      frequencia: null,
      horas: parseNum(form.horas) ?? 60,
      creditos: 0,
      semestre: form.semestre,
      isProjecao: modal.aberto && modal.tipo === "projecao",
    };

    if (modal.aberto && modal.tipo === "editando") {
      const next = [...disciplinas];
      next[modal.index] = {
        ...novaDisc,
        isProjecao: disciplinas[modal.index].isProjecao,
      };
      calcStore.setDisciplinas(next);
    } else {
      if (novaDisc.codigo && isAprovadoOuEquivalente(novaDisc.situacao)) {
        const jaAprovada = disciplinas.some(
          (d) => d.codigo === novaDisc.codigo && isAprovadoOuEquivalente(d.situacao)
        );
        if (jaAprovada) {
          setErroModal("Esta disciplina já consta como aprovada na tabela.");
          return;
        }
      }
      const coreqs = CATALOG_MAP[novaDisc.codigo]?.corequisitos ?? [];
      const toAdd: Disciplina[] = [novaDisc];
      for (const cod of coreqs) {
        if (
          disciplinas.some((d) => d.codigo === cod) ||
          toAdd.some((d) => d.codigo === cod)
        )
          continue;
        const cat = CATALOG_MAP[cod];
        toAdd.push({
          codigo: cod,
          nome: cat?.nome ?? cod,
          situacao: novaDisc.situacao,
          turma: "",
          nota: null,
          vs: null,
          frequencia: null,
          horas: cat?.ch ?? 60,
          creditos: 0,
          semestre: novaDisc.semestre,
          isProjecao: novaDisc.isProjecao,
        });
      }
      calcStore.setDisciplinas([...disciplinas, ...toAdd]);
      onWidgetExpand();
    }

    onClose();
  }, [form, modal, disciplinas, onClose, onWidgetExpand, calcStore]);

  if (!modal.aberto) return null;

  const modalTitulo =
    modal.tipo === "editando"
      ? "Editar disciplina"
      : modal.tipo === "projecao"
        ? "Adicionar projeção"
        : "Adicionar disciplina";

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={modalTitulo}
    >
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitulo}>{modalTitulo}</span>
          <button className={styles.modalFechar} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nome / Código</label>
            <div className={styles.autocompleteWrap}>
              <input
                ref={buscaRef}
                className={styles.formInput}
                value={form.busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                onFocus={() => sugestoes.length > 0 && setSugestaoVisivel(true)}
                onBlur={() => setTimeout(() => setSugestaoVisivel(false), 150)}
                placeholder="Buscar por nome ou código..."
                autoComplete="off"
              />
              {sugestaoVisivel && sugestoes.length > 0 && (
                <div className={styles.sugestoesDropdown}>
                  {sugestoes.map((s) => (
                    <button
                      key={s.codigo}
                      className={styles.sugestaoItem}
                      onMouseDown={() => handleSelecionarSugestao(s)}
                      type="button"
                    >
                      <span className={styles.sugestaoNome}>{s.nome}</span>
                      <span className={styles.sugestaoCodigo}>
                        {s.codigo} · {s.ch}h
                        {s.corequisitos.length > 0 && (
                          <> · co-req: {s.corequisitos.join(", ")}</>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Situação</label>
            <select
              className={styles.formSelect}
              value={form.situacao}
              onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}
            >
              {SITUACOES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nota</label>
              <input
                className={styles.formInput}
                value={form.nota}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nota: clampNota(e.target.value) }))
                }
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="0.0"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>VS</label>
              <input
                className={styles.formInput}
                value={form.vs}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vs: clampNota(e.target.value) }))
                }
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="—"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Período</label>
            <input
              className={styles.formInput}
              value={form.semestre}
              onChange={(e) =>
                setForm((f) => ({ ...f, semestre: normalizeSem(e.target.value) }))
              }
              placeholder="2025.1"
            />
          </div>

          {erroModal && (
            <p className={styles.erroModal} role="alert">
              {erroModal}
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancelar} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={
              modal.tipo === "projecao" ? styles.btnSalvarProjecao : styles.btnSalvar
            }
            onClick={handleSalvar}
          >
            {modal.tipo === "editando" ? "Salvar alterações" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
