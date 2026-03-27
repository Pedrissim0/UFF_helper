"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import styles from "./CalculadoraCR.module.css";
import { useUIStore } from "@/stores/useUIStore";
import {
  useDisciplinasStore,
  isAprovadoOuEquivalente,
} from "@/stores/useDisciplinasStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useCalculadoraStore } from "@/stores/useCalculadoraStore";

import type { Disciplina, HistoricoEntry, ModalState } from "./types";
import {
  CATALOG_MAP,
  parseSem,
  estaExcluida,
  eCovidReprovado,
  calcularNotaEfetiva,
  currentSemester,
} from "./types";

import { MoonIcon, SunIcon, PlusIcon, GridIcon } from "./components/Icons";
import UploadArea from "./components/UploadArea";
import TabelaDisciplinas from "./components/TabelaDisciplinas";
import ModalDisciplina from "./components/ModalDisciplina";
import ModalProjecao from "./components/ModalProjecao";
import FormPeriodo from "./components/FormPeriodo";
import WidgetEstatisticas from "./components/WidgetEstatisticas";

export default function CalculadoraCR() {
  const calcStore = useCalculadoraStore();
  const disciplinas = calcStore.disciplinas as Disciplina[];
  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);

  const [widgetExpanded, setWidgetExpanded] = useState(false);
  const { tema, toggleTema, _hydrateTheme } = useUIStore();
  const { setAprovadas, clearAprovadas } = useDisciplinasStore();
  const [erro, setErro] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>({ aberto: false });
  const [modalProjecaoLote, setModalProjecaoLote] = useState(false);
  const [modalPeriodo, setModalPeriodo] = useState(false);

  const [restorado, setRestorado] = useState(false);

  useEffect(() => {
    _hydrateTheme();
  }, [_hydrateTheme]);

  /* No mount: importar grade como projeção se não houver projeções; abrir widget se há dados */
  useEffect(() => {
    const stored = useCalculadoraStore.getState().disciplinas as Disciplina[];
    const hasProjecoes = stored.some((d) => d.isProjecao);
    if (!hasProjecoes) {
      const selected = useGradeStore.getState().selecionadas;
      const semAtual = currentSemester();
      const toAdd: Disciplina[] = [];
      for (const { codigo, turma } of selected) {
        if (
          stored.some(
            (d) =>
              d.codigo === codigo && (isAprovadoOuEquivalente(d.situacao) || d.isProjecao)
          )
        )
          continue;
        const cat = CATALOG_MAP[codigo];
        toAdd.push({
          codigo,
          nome: cat?.nome ?? codigo,
          situacao: "Aprovado",
          turma,
          nota: 10,
          vs: null,
          frequencia: null,
          horas: cat?.ch ?? 60,
          creditos: 0,
          semestre: semAtual,
          isProjecao: true,
        });
      }
      if (toAdd.length > 0) {
        calcStore.setDisciplinas([...stored, ...toAdd]);
      }
    }
    const total = useCalculadoraStore.getState().disciplinas.length;
    if (total > 0) {
      setWidgetExpanded(true);
      setRestorado(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Sincronizar aprovadas sempre que disciplinas mudar */
  useEffect(() => {
    if (disciplinas.length === 0) {
      clearAprovadas();
    } else {
      setAprovadas(disciplinas);
    }
  }, [disciplinas, setAprovadas, clearAprovadas]);

  /* Cálculo reativo: recalcula CR sempre que disciplinas mudar */
  useEffect(() => {
    if (disciplinas.length === 0) {
      setHistorico([]);
      return;
    }

    const semestres = Array.from(
      new Set(disciplinas.map((d) => d.semestre).filter(Boolean))
    ).sort((a, b) => {
      const pa = parseSem(a),
        pb = parseSem(b);
      return pa.year !== pb.year ? pa.year - pb.year : pa.num - pb.num;
    });

    let numAcum = 0;
    let denomAcum = 0;

    const hist: HistoricoEntry[] = semestres.map((sem) => {
      const deste = disciplinas.filter((x) => x.semestre === sem);
      for (const d of deste) {
        if (estaExcluida(d)) continue;
        if (eCovidReprovado(d)) continue;
        numAcum += calcularNotaEfetiva(d) * d.horas;
        denomAcum += d.horas;
      }
      return {
        periodo: sem,
        cr: denomAcum > 0 ? numAcum / denomAcum : 0,
        temProjecao: deste.some(
          (d) => d.isProjecao && !estaExcluida(d) && !eCovidReprovado(d)
        ),
      };
    });

    setHistorico(hist);
  }, [disciplinas]);

  /* Handlers */
  const handleUploadLoaded = useCallback(() => {
    setWidgetExpanded(true);
  }, []);

  const handleUploadError = useCallback((msg: string) => {
    setErro(msg || null);
  }, []);

  const handleClear = useCallback(() => {
    calcStore.limpar();
    clearAprovadas();
    setWidgetExpanded(false);
    setRestorado(false);
  }, [calcStore, clearAprovadas]);

  const handleExcluir = useCallback(
    (index: number) => {
      calcStore.setDisciplinas(disciplinas.filter((_, i) => i !== index));
    },
    [disciplinas, calcStore]
  );

  const abrirNovo = useCallback((isProjecao: boolean) => {
    setModal({ aberto: true, tipo: isProjecao ? "projecao" : "novo" });
  }, []);

  const abrirEdicao = useCallback((index: number) => {
    setModal({ aberto: true, tipo: "editando", index });
  }, []);

  const fecharModal = useCallback(() => {
    setModal({ aberto: false });
  }, []);

  /* Derived values */
  const crAtual = (() => {
    const reais = historico.filter((e) => !e.temProjecao);
    return reais.length > 0 ? reais[reais.length - 1].cr : null;
  })();

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.semestre}>ECONOMIA · UFF</span>
          <h1 className={styles.titulo}>Calculadora de CR</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/grade" className={styles.navLink}>
            ← Grade Horária
          </Link>
          <Link href="/controlador-faltas" className={styles.navLink}>
            Controlador de Faltas
          </Link>
          <Link href="/roadmap" className={styles.navLink}>
            Roadmap
          </Link>
          <button
            className={styles.themeToggle}
            onClick={toggleTema}
            aria-label={tema === "light" ? "Ativar modo noturno" : "Ativar modo claro"}
            title={tema === "light" ? "Modo noturno" : "Modo claro"}
          >
            {tema === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className={styles.content}>
        <UploadArea
          disciplinas={disciplinas}
          onLoaded={handleUploadLoaded}
          onError={handleUploadError}
          onClear={handleClear}
        />

        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}

        {restorado && (
          <div className={styles.restoreBanner}>
            <span>Dados restaurados da sessão anterior.</span>
            <button onClick={() => setRestorado(false)}>×</button>
          </div>
        )}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <button className={styles.btnAdicionar} onClick={() => abrirNovo(false)}>
            <PlusIcon /> Adicionar disciplina
          </button>
          <button
            className={styles.btnProjecao}
            onClick={() => setModalProjecaoLote(true)}
          >
            <PlusIcon /> Adicionar projeção
          </button>
          <button
            className={styles.btnAdicionar}
            onClick={() => setModalPeriodo(true)}
            disabled={calcStore.fonte === "upload"}
            title={
              calcStore.fonte === "upload"
                ? "Remova o arquivo para adicionar disciplinas manualmente."
                : undefined
            }
          >
            <GridIcon /> Pré-preencher por período
          </button>
        </div>

        <TabelaDisciplinas
          disciplinas={disciplinas}
          onEditar={abrirEdicao}
          onExcluir={handleExcluir}
        />
      </div>

      {/* Widget flutuante */}
      <WidgetEstatisticas
        disciplinas={disciplinas}
        historico={historico}
        crAtual={crAtual}
        expanded={widgetExpanded}
        onToggleExpanded={() => setWidgetExpanded((v) => !v)}
      />

      {/* Modais */}
      <ModalDisciplina
        modal={modal}
        disciplinas={disciplinas}
        onClose={fecharModal}
        onWidgetExpand={() => setWidgetExpanded(true)}
      />

      <ModalProjecao
        aberto={modalProjecaoLote}
        disciplinas={disciplinas}
        onClose={() => setModalProjecaoLote(false)}
        onWidgetExpand={() => setWidgetExpanded(true)}
      />

      <FormPeriodo
        aberto={modalPeriodo}
        disciplinas={disciplinas}
        onClose={() => setModalPeriodo(false)}
        onWidgetExpand={() => setWidgetExpanded(true)}
      />
    </div>
  );
}
