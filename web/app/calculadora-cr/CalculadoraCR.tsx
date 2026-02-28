"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./CalculadoraCR.module.css";
import rawCatalog from "@/data/db_disciplinas.json";

/* ── Catálogo para autocomplete ─────────────────── */
interface CatalogItem {
  codigo: string;
  nome: string;
  ch: number;
}

// Deduplica por código — mantém primeira ocorrência
const CATALOG: CatalogItem[] = Object.values(
  (rawCatalog as { codigo: string; nome: string; ch: number | null }[]).reduce(
    (acc: Record<string, CatalogItem>, d) => {
      if (!acc[d.codigo])
        acc[d.codigo] = { codigo: d.codigo, nome: d.nome, ch: d.ch ?? 60 };
      return acc;
    },
    {}
  )
);

/* ── Types ─────────────────────────────────────── */
interface Disciplina {
  codigo: string;
  nome: string;
  situacao: string;
  turma: string;
  nota: number | null;
  vs: number | null;
  frequencia: number | null;
  horas: number;
  creditos: number;
  semestre: string;
  isProjecao?: boolean;
}

interface FormState {
  busca: string;
  codigo: string;
  nome: string;
  situacao: string;
  nota: string;
  vs: string;
  horas: string;
  semestre: string;
}

interface HistoricoEntry {
  periodo: string;
  cr: number;
  temProjecao: boolean;
}

type ModalState =
  | { aberto: false }
  | { aberto: true; tipo: "novo" }
  | { aberto: true; tipo: "projecao" }
  | { aberto: true; tipo: "editando"; index: number };

/* ── Constants ──────────────────────────────────── */
const FORM_VAZIO: FormState = {
  busca: "",
  codigo: "",
  nome: "",
  situacao: "Aprovado",
  nota: "",
  vs: "",
  horas: "",
  semestre: "",
};

const SITUACOES = [
  "Aprovado",
  "Reprovado",
  "Trancamento",
  "Atividade Complementar",
  "Dispensa",
  "Monitoria",
  "Aprovado Curso de Férias",
];

const SITUACOES_EXCLUIDAS = [
  "trancamento",
  "atividade complementar",
  "dispensa",
  "monitoria",
];

/* ── Helpers ───────────────────────────────────── */
function estaExcluida(d: Disciplina): boolean {
  const s = d.situacao.toLowerCase();
  return SITUACOES_EXCLUIDAS.some((k) => s.includes(k));
}

function eCovidReprovado(d: Disciplina): boolean {
  const m = d.semestre.match(/(\d{4})/);
  if (!m) return false;
  const ano = parseInt(m[1]);
  return (
    ano >= 2020 &&
    ano <= 2022 &&
    d.situacao.toLowerCase().includes("reprovado")
  );
}

function calcularNotaEfetiva(d: Disciplina): number {
  let nota = d.nota ?? 0;
  if (d.vs !== null) {
    const s = d.situacao.toLowerCase();
    if (s.includes("aprovado") && d.vs >= 6) nota = d.vs;
    else if (s.includes("reprovado")) nota = (nota + d.vs) / 2;
  }
  return nota;
}

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = typeof v === "number" ? v : parseFloat(s);
  return isNaN(n) ? null : n;
}

function badgeClass(situacao: string): string {
  const s = situacao.toLowerCase();
  if (s.includes("aprovado")) return styles.badgeAprovado;
  if (s.includes("reprovado")) return styles.badgeReprovado;
  if (s.includes("trancamento")) return styles.badgeTrancamento;
  return styles.badgeNeutro;
}

function parseSem(s: string): { year: number; num: number } {
  const m = s.match(/(\d+)[°º]?\/(\d{4})/);
  return m
    ? { num: parseInt(m[1]), year: parseInt(m[2]) }
    : { num: 0, year: 0 };
}

/* ── Icons ─────────────────────────────────────── */
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ── Component ─────────────────────────────────── */
export default function CalculadoraCR() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [widgetAberto, setWidgetAberto] = useState(false);
  const [tema, setTema] = useState<"light" | "dark">("light");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal / formulário
  const [modal, setModal] = useState<ModalState>({ aberto: false });
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [sugestoes, setSugestoes] = useState<CatalogItem[]>([]);
  const [sugestaoVisivel, setSugestaoVisivel] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  /* Theme */
  useEffect(() => {
    const saved = localStorage.getItem("tema") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ?? (prefersDark ? "dark" : "light");
    setTema(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTema = useCallback(() => {
    setTema((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("tema", next);
      return next;
    });
  }, []);

  /* File processing */
  const processFile = useCallback(async (file: File) => {
    setCarregando(true);
    setErro(null);
    setHistorico([]);
    setWidgetAberto(false);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: unknown[][] = [];

      if (ext === "csv") {
        const Papa = (await import("papaparse")).default;
        const text = await file.text();
        const result = Papa.parse<unknown[]>(text, {
          skipEmptyLines: true,
          dynamicTyping: false,
          delimiter: "",
        });
        rows = result.data;
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
      } else {
        setErro("Formato não suportado. Use .csv ou .xlsx.");
        return;
      }

      const data: Disciplina[] = rows
        .slice(1)
        .map((row) => ({
          codigo: String(row[0] ?? "").trim(),
          nome: String(row[1] ?? "").trim(),
          situacao: String(row[2] ?? "").trim(),
          turma: String(row[3] ?? "").trim(),
          nota: parseNum(row[4]),
          vs: parseNum(row[5]),
          frequencia: parseNum(row[6]),
          horas: parseNum(row[7]) ?? 0,
          creditos: parseNum(row[8]) ?? 0,
          semestre: String(row[9] ?? "").trim(),
        }))
        .filter((d) => d.codigo || d.nome);

      if (data.length === 0) {
        setErro("Nenhuma disciplina encontrada. Verifique se o arquivo segue o formato esperado.");
        return;
      }

      setDisciplinas(data);
    } catch (e) {
      setErro("Erro ao processar arquivo. Verifique o formato e tente novamente.");
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  /* Modal handlers */
  const abrirNovo = useCallback((isProjecao: boolean) => {
    setForm(FORM_VAZIO);
    setSugestoes([]);
    setSugestaoVisivel(false);
    setModal({ aberto: true, tipo: isProjecao ? "projecao" : "novo" });
    setTimeout(() => buscaRef.current?.focus(), 50);
  }, []);

  const abrirEdicao = useCallback(
    (index: number) => {
      const d = disciplinas[index];
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
      setSugestoes([]);
      setSugestaoVisivel(false);
      setModal({ aberto: true, tipo: "editando", index });
      setTimeout(() => buscaRef.current?.focus(), 50);
    },
    [disciplinas]
  );

  const fecharModal = useCallback(() => {
    setModal({ aberto: false });
    setSugestaoVisivel(false);
  }, []);

  const handleBuscaChange = useCallback((value: string) => {
    setForm((f) => ({ ...f, busca: value, nome: value }));
    if (value.length >= 2) {
      const lower = value.toLowerCase();
      const found = CATALOG.filter(
        (d) =>
          d.nome.toLowerCase().includes(lower) ||
          d.codigo.toLowerCase().includes(lower)
      ).slice(0, 8);
      setSugestoes(found);
      setSugestaoVisivel(found.length > 0);
    } else {
      setSugestoes([]);
      setSugestaoVisivel(false);
    }
  }, []);

  const handleSelecionarSugestao = useCallback((item: CatalogItem) => {
    setForm((f) => ({
      ...f,
      busca: item.nome,
      codigo: item.codigo,
      nome: item.nome,
      horas: String(item.ch),
    }));
    setSugestaoVisivel(false);
  }, []);

  const handleSalvarForm = useCallback(() => {
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
      setDisciplinas((prev) => {
        const next = [...prev];
        next[modal.index] = {
          ...novaDisc,
          isProjecao: prev[modal.index].isProjecao,
        };
        return next;
      });
    } else {
      setDisciplinas((prev) => [...prev, novaDisc]);
    }

    fecharModal();
  }, [form, modal, fecharModal]);

  const handleExcluir = useCallback((index: number) => {
    setDisciplinas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* CR calculation */
  const calcularCR = useCallback(() => {
    if (disciplinas.length === 0) return;

    const semestres = Array.from(
      new Set(disciplinas.map((d) => d.semestre).filter(Boolean))
    ).sort((a, b) => {
      const pa = parseSem(a), pb = parseSem(b);
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
    setWidgetAberto(true);
  }, [disciplinas]);

  const crAtual =
    historico.length > 0 ? historico[historico.length - 1].cr : null;

  const modalTitulo = !modal.aberto
    ? ""
    : modal.tipo === "editando"
    ? "Editar disciplina"
    : modal.tipo === "projecao"
    ? "Adicionar projeção"
    : "Adicionar disciplina";

  const uploadCount = disciplinas.filter((d) => !d.isProjecao).length;

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.semestre}>ECONOMIA · UFF</span>
          <h1 className={styles.titulo}>Calculadora de CR</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/" className={styles.navLink}>
            ← Grade Horária
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
        {/* Upload */}
        <div
          className={[
            styles.uploadArea,
            dragOver ? styles.uploadAreaDragOver : "",
            disciplinas.length > 0 ? styles.uploadAreaCompact : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          aria-label="Carregar arquivo de histórico"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            style={{ display: "none" }}
          />
          {carregando ? (
            <span className={styles.uploadMsg}>Processando arquivo...</span>
          ) : uploadCount > 0 ? (
            <span className={styles.uploadMsg}>
              {uploadCount} disciplinas carregadas · clique para trocar arquivo
            </span>
          ) : (
            <>
              <span className={styles.uploadIconWrap}><UploadIcon /></span>
              <span className={styles.uploadMsg}>
                Arraste seu histórico ou clique para selecionar
              </span>
              <span className={styles.uploadHint}>
                .csv ou .xlsx · colunas: Código, Nome, Situação, Turma, Nota,
                VS, Frequência, Horas, Créditos, Semestre
              </span>
            </>
          )}
        </div>

        {erro && <p className={styles.erro}>{erro}</p>}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <button className={styles.btnAdicionar} onClick={() => abrirNovo(false)}>
            <PlusIcon /> Adicionar disciplina
          </button>
        </div>

        {/* Grid */}
        {disciplinas.length > 0 && (
          <>
            <div className={styles.gridWrapper}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th className={styles.thNome}>Nome</th>
                    <th className={styles.thNum}>Nota</th>
                    <th className={styles.thNum}>VS</th>
                    <th className={styles.thNum}>CH</th>
                    <th>Situação</th>
                    <th>Semestre</th>
                    <th className={styles.thAcoes}></th>
                  </tr>
                </thead>
                <tbody>
                  {disciplinas.map((d, i) => (
                    <tr
                      key={i}
                      className={[
                        estaExcluida(d) || eCovidReprovado(d) ? styles.trExcluida : "",
                        d.isProjecao ? styles.trProjecao : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td className={styles.tdCode}>{d.codigo}</td>
                      <td className={styles.tdNome}>
                        {d.nome}
                        {d.isProjecao && (
                          <span className={styles.tagProjecao}>projeção</span>
                        )}
                      </td>
                      <td className={styles.tdNum}>
                        {d.nota !== null ? d.nota.toFixed(1) : "—"}
                      </td>
                      <td className={styles.tdNum}>
                        {d.vs !== null ? d.vs.toFixed(1) : "—"}
                      </td>
                      <td className={styles.tdNum}>{d.horas || "—"}</td>
                      <td>
                        <span className={`${styles.badge} ${badgeClass(d.situacao)}`}>
                          {d.situacao}
                        </span>
                      </td>
                      <td className={styles.tdSemestre}>{d.semestre}</td>
                      <td className={styles.tdAcoes}>
                        <button
                          className={styles.btnIcone}
                          onClick={() => abrirEdicao(i)}
                          title="Editar"
                          aria-label="Editar disciplina"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          className={`${styles.btnIcone} ${styles.btnIconeExcluir}`}
                          onClick={() => handleExcluir(i)}
                          title="Remover"
                          aria-label="Remover disciplina"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.acoes}>
              <button className={styles.btnProjecao} onClick={() => abrirNovo(true)}>
                <PlusIcon /> Adicionar projeção
              </button>
              <button className={styles.btnCalcular} onClick={calcularCR}>
                Calcular CR
              </button>
            </div>
          </>
        )}
      </div>

      {/* Widget flutuante */}
      {widgetAberto && (
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitulo}>Histórico CR</span>
            <button
              className={styles.widgetFechar}
              onClick={() => setWidgetAberto(false)}
              aria-label="Fechar widget"
            >
              ×
            </button>
          </div>

          {crAtual !== null && (
            <div className={styles.crDestaque}>
              <span className={styles.crDestaqueLabel}>CR Atual</span>
              <span className={styles.crDestaqueValor}>{crAtual.toFixed(1)}</span>
            </div>
          )}

          <div className={styles.widgetBody}>
            <table className={styles.widgetTabela}>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>CR acumulado</th>
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
                    <td>{entry.cr.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal adicionar / editar */}
      {modal.aberto && (
        <div
          className={styles.modalOverlay}
          onClick={fecharModal}
          role="dialog"
          aria-modal="true"
          aria-label={modalTitulo}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <span className={styles.modalTitulo}>{modalTitulo}</span>
              <button
                className={styles.modalFechar}
                onClick={fecharModal}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              {/* Nome / busca com autocomplete */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nome / Código</label>
                <div className={styles.autocompleteWrap}>
                  <input
                    ref={buscaRef}
                    className={styles.formInput}
                    value={form.busca}
                    onChange={(e) => handleBuscaChange(e.target.value)}
                    onFocus={() =>
                      sugestoes.length > 0 && setSugestaoVisivel(true)
                    }
                    onBlur={() =>
                      setTimeout(() => setSugestaoVisivel(false), 150)
                    }
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
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Código + CH */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código</label>
                  <input
                    className={styles.formInput}
                    value={form.codigo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, codigo: e.target.value }))
                    }
                    placeholder="ECO00101"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>CH (horas)</label>
                  <input
                    className={styles.formInput}
                    value={form.horas}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, horas: e.target.value }))
                    }
                    type="number"
                    min="0"
                    placeholder="60"
                  />
                </div>
              </div>

              {/* Situação */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Situação</label>
                <select
                  className={styles.formSelect}
                  value={form.situacao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, situacao: e.target.value }))
                  }
                >
                  {SITUACOES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nota + VS */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nota</label>
                  <input
                    className={styles.formInput}
                    value={form.nota}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nota: e.target.value }))
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
                      setForm((f) => ({ ...f, vs: e.target.value }))
                    }
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="—"
                  />
                </div>
              </div>

              {/* Semestre */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Período</label>
                <input
                  className={styles.formInput}
                  value={form.semestre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, semestre: e.target.value }))
                  }
                  placeholder="1º/2025"
                />
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button className={styles.btnCancelar} onClick={fecharModal}>
                Cancelar
              </button>
              <button
                className={
                  modal.tipo === "projecao"
                    ? styles.btnSalvarProjecao
                    : styles.btnSalvar
                }
                onClick={handleSalvarForm}
              >
                {modal.tipo === "editando" ? "Salvar alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
