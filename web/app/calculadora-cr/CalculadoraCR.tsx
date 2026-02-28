"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./CalculadoraCR.module.css";

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
}

interface HistoricoEntry {
  periodo: string;
  cr: number;
}

/* ── Helpers ───────────────────────────────────── */
const SITUACOES_EXCLUIDAS = [
  "trancamento",
  "atividade complementar",
  "dispensa",
  "monitoria",
  "curso de f", // "Aprovado Curso de Férias" não entra no CR
];

function estaExcluida(d: Disciplina): boolean {
  const s = d.situacao.toLowerCase();
  return SITUACOES_EXCLUIDAS.some((k) => s.includes(k));
}

function eCovidReprovado(d: Disciplina): boolean {
  // R1: disciplinas de 2020–2022 reprovadas não entram no cálculo
  // O formato do semestre é "Xº/YYYY", então o ano não está no início da string
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
    if (s.includes("aprovado") && d.vs >= 6) {
      nota = d.vs; // R2a: usa a nota do VS (não um cap fixo em 6)
    } else if (s.includes("reprovado")) {
      nota = (nota + d.vs) / 2; // R2b: média com VS
    }
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

/* ── Icons ─────────────────────────────────────── */
function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
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

  /* Sync with shared theme preference */
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
          delimiter: "", // auto-detect (handles semicolons too)
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
        .slice(1) // skip header row
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
        setErro(
          "Nenhuma disciplina encontrada. Verifique se o arquivo segue o formato esperado."
        );
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
      e.target.value = ""; // allow re-selecting same file
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

  /* CR calculation */
  const calcularCR = useCallback(() => {
    if (disciplinas.length === 0) return;

    // Ordena "Xº/YYYY" corretamente por (ano, nº semestre)
    // .sort() alfabético colocaria todos os "1º/..." antes dos "2º/...", ignorando o ano
    function parseSem(s: string): { year: number; num: number } {
      const m = s.match(/(\d+)[°º]?\/(\d{4})/);
      return m ? { num: parseInt(m[1]), year: parseInt(m[2]) } : { num: 0, year: 0 };
    }
    const semestres = Array.from(
      new Set(disciplinas.map((d) => d.semestre).filter(Boolean))
    ).sort((a, b) => {
      const pa = parseSem(a), pb = parseSem(b);
      return pa.year !== pb.year ? pa.year - pb.year : pa.num - pb.num;
    });

    let numAcum = 0;
    let denomAcum = 0;

    const hist: HistoricoEntry[] = semestres.map((sem) => {
      for (const d of disciplinas.filter((x) => x.semestre === sem)) {
        // R3 + R4: trancamentos, atividades complementares, dispensas e monitorias
        if (estaExcluida(d)) continue;
        // R1: reprovações no período COVID (2020-2022)
        if (eCovidReprovado(d)) continue;

        const nota = calcularNotaEfetiva(d);
        numAcum += nota * d.horas;
        denomAcum += d.horas;
      }

      return {
        periodo: sem,
        cr: denomAcum > 0 ? numAcum / denomAcum : 0,
      };
    });

    setHistorico(hist);
    setWidgetAberto(true);
  }, [disciplinas]);

  const crAtual =
    historico.length > 0 ? historico[historico.length - 1].cr : null;

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
            aria-label={
              tema === "light" ? "Ativar modo noturno" : "Ativar modo claro"
            }
            title={tema === "light" ? "Modo noturno" : "Modo claro"}
          >
            {tema === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className={styles.content}>
        {/* Upload area */}
        <div
          className={[
            styles.uploadArea,
            dragOver ? styles.uploadAreaDragOver : "",
            disciplinas.length > 0 ? styles.uploadAreaCompact : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
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
          ) : disciplinas.length > 0 ? (
            <span className={styles.uploadMsg}>
              {disciplinas.length} disciplinas carregadas · clique para trocar
              arquivo
            </span>
          ) : (
            <>
              <span className={styles.uploadIconWrap}>
                <UploadIcon />
              </span>
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
                  </tr>
                </thead>
                <tbody>
                  {disciplinas.map((d, i) => (
                    <tr
                      key={i}
                      className={
                        estaExcluida(d) || eCovidReprovado(d)
                          ? styles.trExcluida
                          : ""
                      }
                    >
                      <td className={styles.tdCode}>{d.codigo}</td>
                      <td className={styles.tdNome}>{d.nome}</td>
                      <td className={styles.tdNum}>
                        {d.nota !== null ? d.nota.toFixed(1) : "—"}
                      </td>
                      <td className={styles.tdNum}>
                        {d.vs !== null ? d.vs.toFixed(1) : "—"}
                      </td>
                      <td className={styles.tdNum}>{d.horas || "—"}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${badgeClass(d.situacao)}`}
                        >
                          {d.situacao}
                        </span>
                      </td>
                      <td className={styles.tdSemestre}>{d.semestre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.acoes}>
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
              <span className={styles.crDestaqueValor}>
                {crAtual.toFixed(4)}
              </span>
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
                    className={
                      i === historico.length - 1 ? styles.crUltimo : ""
                    }
                  >
                    <td>{entry.periodo}</td>
                    <td>{entry.cr.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
