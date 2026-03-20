"use client";

import { useState, useEffect } from "react";
import styles from "./NameContest.module.css";

const CONTEST_ACTIVE = true;
const LS_KEY = "name-contest-dismissed";

interface Suggestion {
  id: string;
  suggested_name: string;
  votes_count: number;
}

interface Props {
  suggestions: Suggestion[];
}

type Tab = "info" | "suggest" | "vote";

export default function NameContest({ suggestions: initialSuggestions }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Suggestions state (local, updated optimistically)
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  // Form state
  const [suggestedName, setSuggestedName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!CONTEST_ACTIVE) return;
    const dismissed = localStorage.getItem(LS_KEY);
    if (dismissed !== "true") {
      setIsVisible(true);
    }
  }, []);

  if (!CONTEST_ACTIVE || !isVisible) return null;

  function handleClose() {
    setIsVisible(false);
    localStorage.setItem(LS_KEY, "true");
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }

  async function handleSubmitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/name-contest/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestedName: suggestedName.trim(),
          studentName: studentName.trim(),
          whatsapp: whatsapp.trim(),
          pixKey: pixKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao enviar sugestão.");
        return;
      }

      setSuccess("Sugestão enviada! Redirecionando para votação...");
      setSuggestedName("");
      setStudentName("");
      setWhatsapp("");
      setPixKey("");

      // Add to local list optimistically
      setSuggestions((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          suggested_name: suggestedName.trim(),
          votes_count: 0,
        },
      ]);

      setTimeout(() => {
        setTab("vote");
        setSuccess("");
      }, 2000);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(suggestionId: string) {
    if (votedIds.has(suggestionId)) return;

    // Optimistic update
    setVotedIds((prev) => new Set(prev).add(suggestionId));
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, votes_count: s.votes_count + 1 } : s
      )
    );

    try {
      const res = await fetch("/api/name-contest/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId }),
      });

      if (!res.ok) {
        // Revert on error
        setVotedIds((prev) => {
          const next = new Set(prev);
          next.delete(suggestionId);
          return next;
        });
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId ? { ...s, votes_count: s.votes_count - 1 } : s
          )
        );
      }
    } catch {
      // Revert on error
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, votes_count: s.votes_count - 1 } : s
        )
      );
    }
  }

  const sorted = [...suggestions].sort((a, b) =>
    sortOrder === "desc" ? b.votes_count - a.votes_count : a.votes_count - b.votes_count
  );

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalBox}>
        {/* --- TELA INFO --- */}
        {tab === "info" && (
          <>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Concurso de Nome</span>
              <button
                className={styles.closeBtn}
                onClick={handleClose}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <p className={styles.infoText}>
              O projeto ainda não tem nome! Ajude a escolher um nome maneiro e concorra a
              um <strong>pix de galo</strong>.
            </p>

            <ul className={styles.criteriaList}>
              <li>Engraçado ou sarcástico? Melhor ainda</li>
              <li>Curto e cativante — fácil de lembrar</li>
              <li>Criatividade conta muito</li>
            </ul>

            <div className={styles.prize}>Prêmio: R$50 via Pix</div>

            <div className={styles.btnRow}>
              <button className={styles.btnPrimary} onClick={() => setTab("suggest")}>
                Sugerir um nome
              </button>
              <button className={styles.btnSecondary} onClick={() => setTab("vote")}>
                Ver sugestões e votar
              </button>
            </div>
          </>
        )}

        {/* --- TELA SUGERIR --- */}
        {tab === "suggest" && (
          <>
            <div className={styles.modalHeader}>
              <button
                className={styles.backBtn}
                onClick={() => {
                  setTab("info");
                  setError("");
                  setSuccess("");
                }}
                aria-label="Voltar"
              >
                ←
              </button>
              <span className={styles.modalTitle}>Sugerir um nome</span>
              <button
                className={styles.closeBtn}
                onClick={handleClose}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmitSuggestion}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nome sugerido</label>
                <input
                  className={styles.formInput}
                  type="text"
                  value={suggestedName}
                  onChange={(e) => setSuggestedName(e.target.value)}
                  placeholder="Ex: UFFácil, UFFerno..."
                  maxLength={60}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Seu nome</label>
                <input
                  className={styles.formInput}
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Como quer ser creditado"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>WhatsApp</label>
                <input
                  className={styles.formInput}
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(21) 99999-9999"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Chave Pix</label>
                <input
                  className={styles.formInput}
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, email, telefone ou chave aleatória"
                  required
                />
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}
              {success && <p className={styles.successMsg}>{success}</p>}

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar sugestão"}
              </button>
            </form>
          </>
        )}

        {/* --- TELA VOTAR --- */}
        {tab === "vote" && (
          <>
            <div className={styles.modalHeader}>
              <button
                className={styles.backBtn}
                onClick={() => setTab("info")}
                aria-label="Voltar"
              >
                ←
              </button>
              <span className={styles.modalTitle}>Sugestões</span>
              <button
                className={styles.closeBtn}
                onClick={handleClose}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className={styles.voteHeader}>
              <span className={styles.voteTitle}>
                {sorted.length} sugestão{sorted.length !== 1 ? "ões" : ""}
              </span>
              <button
                className={styles.sortBtn}
                onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
              >
                Votos {sortOrder === "desc" ? "↓" : "↑"}
              </button>
            </div>

            <div className={styles.voteList}>
              {sorted.length === 0 ? (
                <p className={styles.emptyMsg}>
                  Nenhuma sugestão ainda. Seja o primeiro!
                </p>
              ) : (
                sorted.map((s) => (
                  <div key={s.id} className={styles.voteItem}>
                    <span className={styles.voteName}>{s.suggested_name}</span>
                    <span className={styles.voteCount}>{s.votes_count}</span>
                    {votedIds.has(s.id) ? (
                      <span className={styles.voteBtnDone}>Votado</span>
                    ) : (
                      <button className={styles.voteBtn} onClick={() => handleVote(s.id)}>
                        Votar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
