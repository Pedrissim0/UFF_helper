"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import styles from "./ControladorFaltas.module.css";
import rawCatalog from "@/data/db_disciplinas.json";
import {
  getControlador,
  setControlador,
  clearControlador,
  getProjecoesCR,
  type DisciplinaFaltas,
} from "@/lib/controladorFaltas";
import { calcularLimiteFaltas } from "@/lib/calcularLimiteFaltas";
import ProfTag from "@/app/components/ProfTag";

/* ── Catálogo ────────────────────────────────────── */
interface CatalogItem {
  codigo: string;
  nome: string;
  ch: number;
  horarios: Record<string, string>;
  nome_exibicao: string;
}

const CATALOG: CatalogItem[] = Object.values(
  (
    rawCatalog as {
      codigo: string;
      nome: string;
      ch: number | null;
      horarios: Record<string, string>;
      nome_exibicao?: string;
    }[]
  ).reduce(
    (acc: Record<string, CatalogItem>, d) => {
      if (!acc[d.codigo]) {
        acc[d.codigo] = {
          codigo: d.codigo,
          nome: d.nome,
          ch: d.ch ?? 60,
          horarios: d.horarios,
          nome_exibicao: d.nome_exibicao || "",
        };
      }
      return acc;
    },
    {}
  )
);

/* ── Helpers ─────────────────────────────────────── */
function buildDisciplinaFaltas(
  codigo: string,
  nome: string,
  cat: CatalogItem | undefined
): DisciplinaFaltas {
  const ch = cat?.ch ?? 60;
  const horarios = cat?.horarios ?? {};
  const aulasReais = Object.values(horarios).filter((h) => h.trim() !== "").length;
  const limite = calcularLimiteFaltas(ch, horarios);
  return {
    codigo,
    nome,
    professor_id: cat?.nome_exibicao || "",
    carga_horaria: ch,
    aulas_por_semana: aulasReais,
    faltas: 0,
    limite,
  };
}

function saveState(disciplinas: DisciplinaFaltas[]) {
  setControlador({
    disciplinas,
    ultima_atualizacao: new Date().toISOString(),
  });
}

/* ── Componente ──────────────────────────────────── */
interface Props {
  nomeCompletoMap: Record<string, string>;
  professorEmailMap: Record<string, string>;
}

export default function ControladorFaltas({ nomeCompletoMap, professorEmailMap }: Props) {
  const [tema, setTema] = useState<"light" | "dark">("light");
  const [disciplinas, setDisciplinas] = useState<DisciplinaFaltas[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Banner de migração (snackbar)
  const [bannerShown, setBannerShown] = useState(false);   // controla renderização
  const [bannerIn, setBannerIn] = useState(false);          // controla slide-in/out
  const [migrationSnapshot, setMigrationSnapshot] = useState<DisciplinaFaltas[]>([]);
  const bannerAutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerExitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autocomplete
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<CatalogItem[]>([]);
  const [sugestaoVisivel, setSugestaoVisivel] = useState(false);
  const [chipsSelecionados, setChipsSelecionados] = useState<Map<string, string>>(new Map()); // codigo → nome
  const buscaRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastKeyRef = useRef(0);

  // Modal de email
  const [emailModal, setEmailModal] = useState<{ displayName: string; docente: string } | null>(null);
  const [modalEmail, setModalEmail] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState<Record<string, boolean>>({});

  /* ── Tema ────────────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem("tema") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (prefersDark ? "dark" : "light");
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

  /* ── Toast ───────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastKeyRef.current += 1;
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2000);
  }, []);

  /* ── Modal de email ──────────────────────── */
  const openEmailModal = useCallback((displayName: string, docente: string) => {
    setEmailModal({ displayName, docente });
    setModalEmail("");
    setModalError("");
  }, []);

  const closeEmailModal = useCallback(() => {
    setEmailModal(null);
    setModalEmail("");
    setModalError("");
    setModalSubmitting(false);
  }, []);

  const handleModalSubmit = useCallback(async () => {
    if (!emailModal) return;
    const emailValue = modalEmail.trim().toLowerCase();
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setModalError("Email inválido.");
      return;
    }
    setModalSubmitting(true);
    setModalError("");
    try {
      const res = await fetch("/api/email-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorName: emailModal.docente, email: emailValue }),
      });
      if (res.ok) {
        setEmailSubmitted((prev) => ({ ...prev, [emailModal.displayName]: true }));
        closeEmailModal();
        showToast("Obrigado. Sua sugestão foi registrada.");
      } else {
        const data = await res.json();
        setModalError(data.error || "Erro ao enviar.");
      }
    } catch {
      setModalError("Erro de conexão.");
    } finally {
      setModalSubmitting(false);
    }
  }, [emailModal, modalEmail, closeEmailModal, showToast]);

  /* ── Carregar do localStorage ─────────────── */
  useEffect(() => {
    const saved = getControlador();
    if (saved && saved.disciplinas.length > 0) {
      setDisciplinas(saved.disciplinas);
      setLoaded(true);
      return;
    }
    // Migração a partir das projeções da Calculadora de CR
    const projecoes = getProjecoesCR();
    if (projecoes.length > 0) {
      const migradas = projecoes.map((p) => {
        const cat = CATALOG.find((c) => c.codigo === p.codigo);
        return buildDisciplinaFaltas(p.codigo, p.nome, cat);
      });
      setDisciplinas(migradas);
      setMigrationSnapshot(migradas);
      saveState(migradas);
      showBanner();
    }
    setLoaded(true);
  }, []);

  /* ── Persistir ao mudar disciplinas ─────── */
  useEffect(() => {
    if (!loaded) return;
    saveState(disciplinas);
  }, [disciplinas, loaded]);

  /* ── Autocomplete ────────────────────────── */
  const handleBuscaChange = useCallback(
    (value: string) => {
      setBusca(value);
      if (value.length >= 2) {
        const lower = value.toLowerCase();
        const jaAdicionadas = new Set(disciplinas.map((d) => d.codigo));
        const found = CATALOG.filter(
          (d) =>
            !jaAdicionadas.has(d.codigo) &&
            !chipsSelecionados.has(d.codigo) &&
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
    [disciplinas, chipsSelecionados]
  );

  const handleSelecionarSugestao = useCallback((item: CatalogItem) => {
    setChipsSelecionados((prev) => {
      const next = new Map(prev);
      next.set(item.codigo, item.nome);
      return next;
    });
    setBusca("");
    setSugestoes([]);
    setSugestaoVisivel(false);
    buscaRef.current?.focus();
  }, []);

  const handleRemoverChip = useCallback((codigo: string) => {
    setChipsSelecionados((prev) => {
      const next = new Map(prev);
      next.delete(codigo);
      return next;
    });
  }, []);

  const handleAdicionar = useCallback(() => {
    if (chipsSelecionados.size === 0) return;
    const novas: DisciplinaFaltas[] = [];
    chipsSelecionados.forEach((nome, codigo) => {
      const cat = CATALOG.find((c) => c.codigo === codigo);
      novas.push(buildDisciplinaFaltas(codigo, nome, cat));
    });
    setDisciplinas((prev) => [...prev, ...novas]);
    setChipsSelecionados(new Map());
    setBusca("");
  }, [chipsSelecionados]);

  /* ── Contador ────────────────────────────── */
  const incrementar = useCallback((index: number) => {
    setDisciplinas((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], faltas: next[index].faltas + 1 };
      return next;
    });
  }, []);

  const decrementar = useCallback((index: number) => {
    setDisciplinas((prev) => {
      const next = [...prev];
      if (next[index].faltas <= 0) return prev;
      next[index] = { ...next[index], faltas: next[index].faltas - 1 };
      return next;
    });
  }, []);

  const removerDisciplina = useCallback((index: number) => {
    setDisciplinas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ── Banner helpers ──────────────────────── */
  const dismissBanner = useCallback(() => {
    if (bannerAutoRef.current) clearTimeout(bannerAutoRef.current);
    setBannerIn(false);
    bannerExitRef.current = setTimeout(() => setBannerShown(false), 400);
  }, []);

  const showBanner = useCallback(() => {
    if (bannerExitRef.current) clearTimeout(bannerExitRef.current);
    setBannerShown(true);
    requestAnimationFrame(() => setBannerIn(true));
    bannerAutoRef.current = setTimeout(() => dismissBanner(), 5000);
  }, [dismissBanner]);

  /* ── Migração ────────────────────────────── */
  const desfazerMigracao = useCallback(() => {
    setDisciplinas([]);
    saveState([]);
    clearControlador();
    dismissBanner();
    setMigrationSnapshot([]);
  }, [dismissBanner]);

  /* ── Cor do contador ─────────────────────── */
  function getFaltasColor(faltas: number, limite: number): string {
    if (limite === 0) return "normal";
    const pct = faltas / limite;
    if (pct >= 1.0) return "vermelho";
    if (pct >= 0.75) return "laranja";
    if (pct >= 0.5) return "amarelo";
    return "normal";
  }

  /* ── Render ──────────────────────────────── */
  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.semestre}>2025.2 · ECONOMIA · UFF</span>
          <h1 className={styles.titulo}>Controlador de Faltas</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/" className={styles.navLink}>
            Grade Horária
          </Link>
          <Link href="/calculadora-cr" className={styles.navLink}>
            Calculadora de CR
          </Link>
          <button
            className={styles.themeToggle}
            onClick={toggleTema}
            aria-label={tema === "light" ? "Ativar modo noturno" : "Ativar modo claro"}
            title={tema === "light" ? "Modo noturno" : "Modo claro"}
          >
            {tema === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
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
            )}
          </button>
        </div>
      </header>

      <main className={styles.content}>
        {/* Snackbar de migração — renderizado fora do fluxo via portal-like fixed */}

        {/* Área de busca */}
        <div className={styles.buscaSection}>
          <div className={styles.autocompleteWrap}>
            <input
              ref={buscaRef}
              type="text"
              className={styles.buscaInput}
              placeholder="Buscar disciplina por nome ou código..."
              value={busca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              onFocus={() => sugestoes.length > 0 && setSugestaoVisivel(true)}
              onBlur={() => setTimeout(() => setSugestaoVisivel(false), 150)}
              autoComplete="off"
            />
            {sugestaoVisivel && (
              <div className={styles.sugestoesDropdown}>
                {sugestoes.map((item) => (
                  <button
                    key={item.codigo}
                    className={styles.sugestaoItem}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelecionarSugestao(item);
                    }}
                  >
                    <span className={styles.sugestaoNome}>{item.nome}</span>
                    <span className={styles.sugestaoCodigo}>{item.codigo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chips */}
          {chipsSelecionados.size > 0 && (
            <div className={styles.chips}>
              {Array.from(chipsSelecionados.entries()).map(([codigo, nome]) => (
                <span key={codigo} className={styles.chip}>
                  <span className={styles.chipNome}>{nome}</span>
                  <button
                    className={styles.chipRemove}
                    onClick={() => handleRemoverChip(codigo)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            className={styles.adicionarBtn}
            onClick={handleAdicionar}
            disabled={chipsSelecionados.size === 0}
          >
            {chipsSelecionados.size > 0
              ? `Adicionar (${chipsSelecionados.size})`
              : "Selecione disciplinas acima"}
          </button>
        </div>

        {/* Grid de cards */}
        {disciplinas.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📋</span>
            <p className={styles.emptyText}>
              Nenhuma disciplina adicionada.
            </p>
            <p className={styles.emptyHint}>
              Busque e selecione disciplinas para acompanhar suas faltas.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {disciplinas.map((d, i) => {
              const cor = getFaltasColor(d.faltas, d.limite);
              return (
                <div
                  key={`${d.codigo}-${i}`}
                  className={styles.card}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Esquerda: nome + prof */}
                  <div className={styles.cardLeft}>
                    <span className={styles.cardNome}>{d.nome}</span>
                    {d.professor_id && (() => {
                      const docente = nomeCompletoMap[d.professor_id] || d.professor_id;
                      const confirmedEmail = professorEmailMap[docente];
                      return (
                        <ProfTag
                          nomeExibicao={d.professor_id}
                          nomeCompleto={docente}
                          confirmedEmail={confirmedEmail}
                          alreadySubmitted={emailSubmitted[d.professor_id]}
                          onSuggestEmail={() => openEmailModal(d.professor_id, docente)}
                          onCopy={() => {
                            const copyText = confirmedEmail
                              ? `Professor: ${docente} | Email: ${confirmedEmail}`
                              : docente;
                            navigator.clipboard.writeText(copyText);
                            showToast("Copiado!");
                          }}
                        />
                      );
                    })()}
                    <span className={styles.cardMeta}>
                      {d.carga_horaria}h · {d.aulas_por_semana}×/sem
                    </span>
                  </div>

                  {/* Direita: contador + remover */}
                  <div className={styles.cardRight}>
                    <button
                      className={styles.counterBtn}
                      onClick={() => decrementar(i)}
                      disabled={d.faltas <= 0}
                    >
                      −
                    </button>
                    <span className={styles.counterValue} data-color={cor}>
                      {d.faltas}
                      <span className={styles.counterSep}>/</span>
                      <span className={styles.counterLimite}>{d.limite}</span>
                    </span>
                    <button
                      className={styles.counterBtn}
                      onClick={() => incrementar(i)}
                    >
                      +
                    </button>
                    <button
                      className={styles.cardRemove}
                      onClick={() => removerDisciplina(i)}
                      title="Remover"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {disciplinas.length > 0 && (
          <div className={styles.footer}>
            <button
              className={styles.clearBtn}
              onClick={() => {
                if (window.confirm("Limpar todas as disciplinas?")) {
                  setDisciplinas([]);
                  clearControlador();
                  dismissBanner();
                }
              }}
            >
              Limpar tudo
            </button>
          </div>
        )}
      </main>

      {/* Snackbar de migração */}
      {bannerShown && (
        <div className={`${styles.snackbar} ${bannerIn ? styles.snackbarIn : ""}`}>
          <span className={styles.snackbarText}>
            {migrationSnapshot.length} disciplina{migrationSnapshot.length !== 1 ? "s" : ""} importada{migrationSnapshot.length !== 1 ? "s" : ""} das suas projeções.
          </span>
          <div className={styles.snackbarActions}>
            <button className={styles.snackbarUndo} onClick={desfazerMigracao}>
              Desfazer
            </button>
            <button className={styles.snackbarClose} onClick={dismissBanner}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modal de sugestão de email */}
      {emailModal && (
        <div
          className={styles.modalOverlay}
          onClick={closeEmailModal}
          onKeyDown={(e) => e.key === "Escape" && closeEmailModal()}
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalProf}>{emailModal.docente}</p>
            <input
              className={styles.modalInput}
              type="email"
              placeholder="email@exemplo.com"
              value={modalEmail}
              autoFocus
              onChange={(e) => setModalEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
            />
            {modalError && <p className={styles.modalError}>{modalError}</p>}
            <button
              className={styles.modalSubmitBtn}
              onClick={handleModalSubmit}
              disabled={modalSubmitting}
            >
              {modalSubmitting ? "Enviando..." : "Enviar sugestão"}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div key={toastKeyRef.current} className={styles.toast}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
