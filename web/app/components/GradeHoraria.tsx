"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { Materia } from "../grade/page";
import styles from "./GradeHoraria.module.css";
import { useUIStore } from "@/stores/useUIStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useDisciplinasStore } from "@/stores/useDisciplinasStore";
import { filtrarDisciplinas } from "@/lib/filtrarDisciplinas";

import type { Dia, Turno } from "./grade/types";
import { DIAS, PALETTE, parseTime } from "./grade/types";
import FiltrosDisciplinas from "./grade/FiltrosDisciplinas";
import CardDisciplina from "./grade/CardDisciplina";
import GradeSemanal from "./grade/GradeSemanal";
import Legenda from "./grade/Legenda";

interface Props {
  materias: Materia[];
  nomeCompletoMap?: Record<string, string>;
  professorEmailMap?: Record<string, string>;
  difficultyMap?: Record<string, { avg: number; count: number }>;
}

export default function GradeHoraria({
  materias,
  nomeCompletoMap = {},
  professorEmailMap = {},
  difficultyMap = {},
}: Props) {
  const gradeStore = useGradeStore();
  const { aprovadas: aprovadasArr } = useDisciplinasStore();
  const aprovadas = useMemo(() => new Set(aprovadasArr), [aprovadasArr]);

  const selecionadas = useMemo(
    () =>
      gradeStore.selecionadas
        .map(({ codigo, turma }) =>
          materias.find((m) => m.codigo === codigo && m.turma === turma)
        )
        .filter((m): m is Materia => m !== undefined),
    [gradeStore.selecionadas, materias]
  );

  const periodosColapsados = useMemo(
    () => new Set(gradeStore.periodosColapsados),
    [gradeStore.periodosColapsados]
  );

  const [busca, setBusca] = useState("");
  const [gradeAberta, setGradeAberta] = useState(false);
  const [filtrosAberto, setFiltrosAberto] = useState(false);
  const [diasFiltro, setDiasFiltro] = useState<Set<Dia>>(new Set());
  const [turnosFiltro, setTurnosFiltro] = useState<Set<Turno>>(new Set());
  const [deptosFiltro, setDeptosFiltro] = useState<Set<string>>(new Set());
  const [periodosFiltro, setPeriodosFiltro] = useState<Set<string>>(new Set());
  const [tipoFiltro, setTipoFiltro] = useState<"obrigatoria" | "optativa" | null>(null);
  const [listaAnim, setListaAnim] = useState(false);
  const didMountAnim = useRef(false);
  const [widgetPos, setWidgetPos] = useState<"center" | "left" | "right">("right");
  const [widgetWidth, setWidgetWidth] = useState(500);
  const [legendaVisivel, setLegendaVisivel] = useState(true);
  const { tema, toggleTema, _hydrateTheme } = useUIStore();
  const resizingRef = useRef(false);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodosIniciados = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [widgetPeeking, setWidgetPeeking] = useState(false);
  const [ordenacao, setOrdenacao] = useState<
    "dificuldade-asc" | "dificuldade-desc" | null
  >(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastKeyRef = useRef(0);

  // Email crowdsourcing
  const [emailSubmitted, setEmailSubmitted] = useState<Record<string, boolean>>({});
  const [emailModal, setEmailModal] = useState<{
    displayName: string;
    docente: string;
  } | null>(null);
  const [modalEmail, setModalEmail] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Difficulty (Mamatômetro)
  const [difficultySubmitted, setDifficultySubmitted] = useState<Record<string, boolean>>(
    {}
  );
  const [difficultyModal, setDifficultyModal] = useState<{
    displayName: string;
    docente: string;
    codigoDisciplina: string;
    nomeDisciplina: string;
  } | null>(null);
  const [sliderValue, setSliderValue] = useState(3);
  const [difficultySubmitting, setDifficultySubmitting] = useState(false);
  const [difficultyError, setDifficultyError] = useState("");

  useEffect(() => {
    _hydrateTheme();
  }, [_hydrateTheme]);

  useEffect(() => {
    if (aprovadas.size > 0 && gradeStore.jaCursadoFiltro === null) {
      gradeStore.setJaCursadoFiltro("nao");
    } else if (aprovadas.size === 0 && gradeStore.jaCursadoFiltro !== null) {
      gradeStore.setJaCursadoFiltro(null);
    }
  }, [aprovadas.size]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!didMountAnim.current) {
      didMountAnim.current = true;
      return;
    }
    setListaAnim(true);
    const t = setTimeout(() => setListaAnim(false), 300);
    return () => clearTimeout(t);
  }, [gradeStore.jaCursadoFiltro]);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastKeyRef.current += 1;
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2000);
  }, []);

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

  const openDifficultyModal = useCallback(
    (
      displayName: string,
      docente: string,
      codigoDisciplina: string,
      nomeDisciplina: string
    ) => {
      setDifficultyModal({ displayName, docente, codigoDisciplina, nomeDisciplina });
      setSliderValue(3);
      setDifficultyError("");
    },
    []
  );

  const closeDifficultyModal = useCallback(() => {
    setDifficultyModal(null);
    setDifficultyError("");
    setDifficultySubmitting(false);
  }, []);

  const handleDifficultySubmit = useCallback(async () => {
    if (!difficultyModal) return;
    setDifficultySubmitting(true);
    setDifficultyError("");

    try {
      const res = await fetch("/api/difficulty-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professorName: difficultyModal.docente,
          disciplinaCodigo: difficultyModal.codigoDisciplina,
          rating: sliderValue,
        }),
      });

      if (res.ok) {
        const key = `${difficultyModal.docente}:${difficultyModal.codigoDisciplina}`;
        setDifficultySubmitted((prev) => ({ ...prev, [key]: true }));
        closeDifficultyModal();
        showToast("Obrigado! Seu voto foi registrado.");
      } else {
        const data = await res.json();
        setDifficultyError(data.error || "Erro ao enviar.");
      }
    } catch {
      setDifficultyError("Erro de conexão.");
    } finally {
      setDifficultySubmitting(false);
    }
  }, [difficultyModal, sliderValue, closeDifficultyModal, showToast]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
    };
  }, []);

  const isLateral = widgetPos === "left" || widgetPos === "right";
  const showLegenda = legendaVisivel && selecionadas.length > 0;

  const handleCopiar = useCallback(() => {
    const text = selecionadas
      .map((m) => {
        const horarios = DIAS.filter((d) => m.horarios[d])
          .map((d) => `${d}: ${m.horarios[d]}`)
          .join(", ");
        const docente = nomeCompletoMap[m.nome_exibicao] || m.nome_exibicao;
        const email = professorEmailMap[docente];
        const profLine = email
          ? `Prof: ${docente} | Email: ${email}`
          : `Prof: ${docente}`;
        return `${m.codigo} - ${m.nome} - Turma ${m.turma} - ${profLine} - ${horarios}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    showToast("Copiado!");
  }, [selecionadas, nomeCompletoMap, professorEmailMap, showToast]);

  const handleExportarPDF = useCallback(() => {
    setGradeAberta(true);
    setLegendaVisivel(true);
    requestAnimationFrame(() => window.print());
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = true;
      const startX = e.clientX;
      const startWidth = widgetWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = widgetPos === "right" ? startX - ev.clientX : ev.clientX - startX;
        const newWidth = Math.max(
          360,
          Math.min(window.innerWidth * 0.6, startWidth + delta)
        );
        setWidgetWidth(newWidth);
      };

      const onMouseUp = () => {
        resizingRef.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [widgetWidth, widgetPos]
  );

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let i = 0;
    materias.forEach((m) => {
      const key = `${m.codigo}-${m.turma}`;
      if (!map[key]) map[key] = PALETTE[i++ % PALETTE.length];
    });
    return map;
  }, [materias]);

  const departamentos = useMemo(() => {
    const counts: Record<string, number> = {};
    materias.forEach((m) => {
      const depto = m.codigo.replace(/[0-9]/g, "");
      counts[depto] = (counts[depto] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([depto, count]) => ({ depto, count }));
  }, [materias]);

  const periodos = useMemo(() => {
    const s = new Set<number>();
    materias.forEach((m) => {
      if (m.periodo !== null) s.add(m.periodo);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [materias]);

  const activeFilterCount =
    diasFiltro.size +
    turnosFiltro.size +
    deptosFiltro.size +
    periodosFiltro.size +
    (tipoFiltro ? 1 : 0) +
    (gradeStore.jaCursadoFiltro ? 1 : 0);

  const filtradas = useMemo(
    () =>
      filtrarDisciplinas(
        materias,
        {
          busca,
          dias: diasFiltro,
          turnos: turnosFiltro,
          deptos: deptosFiltro,
          periodos: periodosFiltro,
          tipo: tipoFiltro,
          jaCursado: gradeStore.jaCursadoFiltro,
        },
        aprovadas
      ),
    [
      busca,
      materias,
      diasFiltro,
      turnosFiltro,
      deptosFiltro,
      periodosFiltro,
      tipoFiltro,
      gradeStore.jaCursadoFiltro,
      aprovadas,
    ]
  );

  const getDificuldade = useCallback(
    (m: Materia): number | null => {
      if (!difficultyMap || !nomeCompletoMap) return null;
      const key = `${nomeCompletoMap[m.nome_exibicao] || m.nome_exibicao}:${m.codigo}`;
      const entry = difficultyMap[key];
      return entry && entry.count > 0 ? entry.avg : null;
    },
    [difficultyMap, nomeCompletoMap]
  );

  const periodoGroups = useMemo(() => {
    const groups: Map<string, Materia[]> = new Map();
    filtradas.forEach((m) => {
      const key =
        m.periodo !== null
          ? String(m.periodo)
          : m.tipo === "obrigatoria"
            ? "obrig-np"
            : "optativas";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const order = (k: string) =>
          k.match(/^\d+$/) ? parseInt(k) : k === "obrig-np" ? 9998 : 9999;
        return order(a) - order(b);
      })
      .map(([key, materias]) => {
        if (!ordenacao) return { key, materias };
        const sorted = [...materias].sort((a, b) => {
          const da = getDificuldade(a);
          const db = getDificuldade(b);
          if (da === null && db === null) return 0;
          if (da === null) return 1;
          if (db === null) return -1;
          return ordenacao === "dificuldade-asc" ? da - db : db - da;
        });
        return { key, materias: sorted };
      });
  }, [filtradas, ordenacao, getDificuldade]);

  useEffect(() => {
    if (periodosIniciados.current) return;
    if (periodoGroups.length === 0) return;
    if (gradeStore.periodosColapsados.length === 0) {
      const autoColapsados: string[] = [];
      for (const { key: gKey, materias: gMaterias } of periodoGroups) {
        if (!gKey.match(/^\d+$/)) continue;
        const obrig = gMaterias.filter((m) => m.tipo === "obrigatoria");
        if (obrig.length > 0 && obrig.every((m) => aprovadas.has(m.codigo))) {
          autoColapsados.push(gKey);
        }
      }
      if (autoColapsados.length > 0) gradeStore.setPeriodosColapsados(autoColapsados);
    }
    periodosIniciados.current = true;
  }, [periodoGroups, aprovadas, gradeStore]);

  function isSelecionada(m: Materia) {
    return selecionadas.some((s) => s.codigo === m.codigo && s.turma === m.turma);
  }

  function temConflito(candidata: Materia) {
    if (
      selecionadas.some(
        (s) => s.codigo === candidata.codigo && s.turma !== candidata.turma
      )
    ) {
      return true;
    }
    for (const dia of DIAS) {
      const t1 = parseTime(candidata.horarios[dia]);
      if (!t1) continue;
      for (const s of selecionadas) {
        if (s.codigo === candidata.codigo && s.turma === candidata.turma) continue;
        const t2 = parseTime(s.horarios[dia]);
        if (!t2) continue;
        if (t1.start < t2.end && t1.end > t2.start) return true;
      }
    }
    return false;
  }

  function toggle(m: Materia) {
    if (isSelecionada(m)) {
      const coReqCodes = new Set<string>(m.corequisitos ?? []);
      for (const s of selecionadas) {
        if ((s.corequisitos ?? []).includes(m.codigo)) coReqCodes.add(s.codigo);
      }
      const novas = selecionadas.filter(
        (s) =>
          !(s.codigo === m.codigo && s.turma === m.turma) && !coReqCodes.has(s.codigo)
      );
      gradeStore.setSelecionadas(
        novas.map((s) => ({ codigo: s.codigo, turma: s.turma }))
      );
    } else {
      const toAdd: Materia[] = [m];
      for (const coReqCode of m.corequisitos ?? []) {
        if (selecionadas.some((s) => s.codigo === coReqCode)) continue;

        const prefix = m.turma[0];
        const myTurmas = Array.from(
          new Set(
            materias
              .filter((x) => x.codigo === m.codigo && x.turma[0] === prefix)
              .map((x) => x.turma)
          )
        ).sort();
        const myIdx = myTurmas.indexOf(m.turma);

        const coReqTurmas = Array.from(
          new Set(
            materias
              .filter((x) => x.codigo === coReqCode && x.turma[0] === prefix)
              .map((x) => x.turma)
          )
        ).sort();

        let coReq: Materia | undefined;
        if (myIdx >= 0 && myIdx < coReqTurmas.length) {
          coReq = materias.find(
            (x) => x.codigo === coReqCode && x.turma === coReqTurmas[myIdx]
          );
        } else {
          coReq =
            materias.find((x) => x.codigo === coReqCode && x.turma[0] === prefix) ||
            materias.find((x) => x.codigo === coReqCode);
        }

        if (coReq) toAdd.push(coReq);
      }
      const novas = [...selecionadas, ...toAdd];
      gradeStore.setSelecionadas(
        novas.map((s) => ({ codigo: s.codigo, turma: s.turma }))
      );
      if (toAdd.length > 1) {
        showToast(
          `Co-req adicionado: ${toAdd
            .slice(1)
            .map((x) => x.nome)
            .join(", ")}`
        );
      }
    }
    if (isLateral && !gradeAberta) {
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
      setWidgetPeeking(true);
      peekTimeoutRef.current = setTimeout(() => setWidgetPeeking(false), 1500);
    }
  }

  const togglePeriodo = useCallback(
    (gKey: string) => {
      gradeStore.togglePeriodo(gKey);
    },
    [gradeStore]
  );

  const temFiltroAtivo =
    busca.trim().length > 0 ||
    diasFiltro.size > 0 ||
    turnosFiltro.size > 0 ||
    deptosFiltro.size > 0 ||
    periodosFiltro.size > 0 ||
    !!tipoFiltro ||
    !!gradeStore.jaCursadoFiltro;

  const totalHoras = selecionadas.reduce((acc, m) => acc + (m.ch ?? 0), 0);
  const expanded = gradeAberta;
  const handleLabel =
    selecionadas.length > 0
      ? `📅 ${selecionadas.length} mat. · ${totalHoras}h`
      : "📅 Grade";

  const widgetPosClass =
    widgetPos === "center"
      ? styles.widget_center
      : widgetPos === "left"
        ? styles.widget_left
        : styles.widget_right;

  /* ── Helper: build CardDisciplina props for a materia ── */
  function renderCard(m: Materia, keyPrefix: string = "") {
    const key = `${keyPrefix}${m.codigo}-${m.turma}`;
    const docente = nomeCompletoMap[m.nome_exibicao] || m.nome_exibicao;
    const diffKey = `${docente}:${m.codigo}`;
    return (
      <CardDisciplina
        key={key}
        materia={m}
        selecionada={isSelecionada(m)}
        conflito={!isSelecionada(m) && temConflito(m)}
        aprovada={aprovadas.has(m.codigo)}
        color={colorMap[`${m.codigo}-${m.turma}`]}
        nomeCompleto={docente}
        confirmedEmail={professorEmailMap[docente]}
        alreadySubmittedEmail={emailSubmitted[m.nome_exibicao] || false}
        difficultyAvg={difficultyMap[diffKey]?.avg}
        difficultyCount={difficultyMap[diffKey]?.count}
        difficultySubmitted={difficultySubmitted[diffKey] || false}
        onToggle={() => toggle(m)}
        onSuggestEmail={() => openEmailModal(m.nome_exibicao, docente)}
        onContributeDifficulty={() =>
          openDifficultyModal(m.nome_exibicao, docente, m.codigo, m.nome)
        }
        onCopyProf={() => {
          const email = professorEmailMap[docente];
          const copyText = email ? `Professor: ${docente} | Email: ${email}` : docente;
          navigator.clipboard.writeText(copyText);
          showToast("Copiado!");
        }}
      />
    );
  }

  return (
    <div
      className={styles.wrapper}
      style={
        isLateral && expanded && !isMobile
          ? {
              paddingRight: widgetPos === "right" ? widgetWidth + 16 : undefined,
              paddingLeft: widgetPos === "left" ? widgetWidth + 16 : undefined,
            }
          : undefined
      }
    >
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.semestre}>ECONOMIA · 2026.1</span>
          <h1 className={styles.titulo}>Montador de Grade</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/calculadora-cr" className={styles.navLink}>
            Calculadora de CR
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
            {tema === "light" ? (
              <svg
                aria-hidden="true"
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
            ) : (
              <svg
                aria-hidden="true"
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
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.buscaRow}>
          <input
            className={styles.busca}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, código, turma ou professor..."
          />
          <button
            className={`${styles.filtroToggle} ${filtrosAberto ? styles.filtroToggleAberto : ""}`}
            onClick={() => setFiltrosAberto(!filtrosAberto)}
          >
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <span className={styles.chevron}>▾</span>
          </button>
        </div>

        <FiltrosDisciplinas
          aberto={filtrosAberto}
          aprovadas={aprovadas}
          diasFiltro={diasFiltro}
          setDiasFiltro={setDiasFiltro}
          turnosFiltro={turnosFiltro}
          setTurnosFiltro={setTurnosFiltro}
          deptosFiltro={deptosFiltro}
          setDeptosFiltro={setDeptosFiltro}
          periodosFiltro={periodosFiltro}
          setPeriodosFiltro={setPeriodosFiltro}
          tipoFiltro={tipoFiltro}
          setTipoFiltro={setTipoFiltro}
          departamentos={departamentos}
          periodos={periodos}
        />

        <div className={styles.statusBar}>
          <span className={styles.statusTxt}>
            {filtradas.length} turmas · {selecionadas.length} selecionadas
          </span>
          <div className={styles.statusActions}>
            <button
              className={`${styles.sortBtn} ${ordenacao ? styles.sortBtnAtivo : ""}`}
              title={
                ordenacao === "dificuldade-desc"
                  ? "Mais difíceis primeiro"
                  : ordenacao === "dificuldade-asc"
                    ? "Mais fáceis primeiro"
                    : "Ordenar por dificuldade"
              }
              onClick={() =>
                setOrdenacao((prev) =>
                  prev === null
                    ? "dificuldade-desc"
                    : prev === "dificuldade-desc"
                      ? "dificuldade-asc"
                      : null
                )
              }
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ordenacao === "dificuldade-asc" ? (
                  <>
                    <path d="M12 5v14" />
                    <path d="M5 12l7 7 7-7" />
                  </>
                ) : (
                  <>
                    <path d="M12 19V5" />
                    <path d="M5 12l7-7 7 7" />
                  </>
                )}
              </svg>
              {ordenacao === "dificuldade-desc"
                ? "Mais difíceis"
                : ordenacao === "dificuldade-asc"
                  ? "Mais fáceis"
                  : "Dificuldade"}
            </button>
            {selecionadas.length > 0 && (
              <button className={styles.limpar} onClick={() => gradeStore.limpar()}>
                Limpar
              </button>
            )}
          </div>
        </div>

        <ul className={`${styles.lista} ${listaAnim ? styles.listaAnim : ""}`}>
          {/* Selecionadas — sempre no topo */}
          {selecionadas.length > 0 && (
            <React.Fragment>
              <li className={styles.selecionadasSeparator}>Selecionadas</li>
              {selecionadas.map((m) => renderCard(m, "sel-"))}
            </React.Fragment>
          )}

          {/* Grupos por período */}
          {periodoGroups.map(({ key: gKey, materias }) => {
            const label = gKey.match(/^\d+$/)
              ? `${gKey}° Período`
              : gKey === "obrig-np"
                ? "Obrigatórias — Sem Período"
                : "Optativas";
            const colapsado = !temFiltroAtivo && periodosColapsados.has(gKey);
            return (
              <React.Fragment key={gKey}>
                <li
                  className={styles.periodSeparator}
                  onClick={() => togglePeriodo(gKey)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && togglePeriodo(gKey)}
                >
                  {label}
                  <svg
                    className={[
                      styles.chevronPeriodo,
                      colapsado ? styles.chevronPeriodoCollapsed : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden="true"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </li>
                <li
                  className={[
                    styles.periodItemsWrapper,
                    colapsado ? styles.periodItemsWrapperCollapsed : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden={colapsado}
                >
                  <ul className={styles.periodItemsList}>
                    {materias.map((m) => renderCard(m))}
                  </ul>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>

      {/* Floating grade widget */}
      <div
        className={`${styles.widget} ${widgetPosClass} ${!expanded ? styles.widgetCollapsed : styles.widgetExpanded}${widgetPeeking && !expanded ? ` ${styles.widgetPeeking}` : ""}`}
        style={isLateral ? { width: widgetWidth } : undefined}
      >
        {isLateral && (
          <div
            className={`${styles.resizeHandle} ${widgetPos === "left" ? styles.resizeHandleRight : styles.resizeHandleLeft}`}
            onMouseDown={handleResizeStart}
          />
        )}

        <div className={styles.handle} onClick={() => setGradeAberta((prev) => !prev)}>
          {handleLabel}
          <span className={styles.handleSpacer} />
          {selecionadas.length > 0 && (
            <div className={styles.actionBtns}>
              <button
                className={`${styles.posBtn} ${legendaVisivel ? styles.posBtnAtivo : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLegendaVisivel((v) => !v);
                }}
                aria-label={legendaVisivel ? "Ocultar legenda" : "Exibir legenda"}
                title={legendaVisivel ? "Ocultar legenda" : "Exibir legenda"}
              >
                {legendaVisivel ? (
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
              <button
                className={styles.posBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopiar();
                }}
                aria-label="Copiar grade"
                title="Copiar grade"
              >
                {toastMsg === "Copiado!" ? (
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
              <button
                className={styles.posBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportarPDF();
                }}
                aria-label="Imprimir grade"
                title="Imprimir grade"
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          )}
          <div className={styles.posBtns}>
            <button
              className={`${styles.posBtn} ${widgetPos === "left" ? styles.posBtnAtivo : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setWidgetPos("left");
              }}
              aria-label="Mover para esquerda"
            >
              ←
            </button>
            <button
              className={`${styles.posBtn} ${widgetPos === "center" ? styles.posBtnAtivo : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setWidgetPos("center");
              }}
              aria-label="Centralizar"
            >
              ·
            </button>
            <button
              className={`${styles.posBtn} ${widgetPos === "right" ? styles.posBtnAtivo : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setWidgetPos("right");
              }}
              aria-label="Mover para direita"
            >
              →
            </button>
          </div>
        </div>

        <div
          className={`${styles.gradeContent} ${expanded ? styles.gradeContentExpanded : ""}`}
        >
          <div className={styles.gradeInner}>
            <GradeSemanal
              selecionadas={selecionadas}
              colorMap={colorMap}
              showLegenda={showLegenda}
            />
            {showLegenda && <Legenda selecionadas={selecionadas} colorMap={colorMap} />}
          </div>
        </div>
      </div>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          className={styles.scrollTopBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="17 11 12 6 7 11" />
            <polyline points="17 18 12 13 7 18" />
          </svg>
        </button>
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
            {modalError && (
              <p className={styles.modalError} role="alert">
                {modalError}
              </p>
            )}
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

      {/* Modal Mamatômetro */}
      {difficultyModal && (
        <div
          className={styles.modalOverlay}
          onClick={closeDifficultyModal}
          onKeyDown={(e) => e.key === "Escape" && closeDifficultyModal()}
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalProf}>{difficultyModal.docente}</p>
            <p className={styles.modalDisciplina}>{difficultyModal.nomeDisciplina}</p>
            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabels}>
                <span>Mamata</span>
                <span>Normal</span>
                <span>Não pegue</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className={styles.difficultySlider}
              />
              <div className={styles.sliderValue}>{sliderValue}/5</div>
            </div>
            {difficultyError && (
              <p className={styles.modalError} role="alert">
                {difficultyError}
              </p>
            )}
            <button
              className={styles.modalSubmitBtn}
              onClick={handleDifficultySubmit}
              disabled={difficultySubmitting}
            >
              {difficultySubmitting ? "Enviando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {toastMsg && (
        <div
          key={toastKeyRef.current}
          className={styles.toast}
          role="status"
          aria-live="polite"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
