"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro capturado pelo error boundary:", error);
  }, [error]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>!</div>
        <h2 style={styles.title}>Algo deu errado</h2>
        <p style={styles.description}>
          Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
        </p>
        <div style={styles.actions}>
          <button onClick={reset} style={styles.primaryBtn}>
            Tentar novamente
          </button>
          <a href="/" style={styles.secondaryBtn}>
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "1rem",
    background: "var(--bg-page)",
  },
  card: {
    textAlign: "center",
    maxWidth: 420,
    padding: "2.5rem 2rem",
    borderRadius: 12,
    background: "var(--bg-card)",
    border: "1px solid var(--border-medium)",
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#fef2f2",
    color: "#dc2626",
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "var(--text-muted)",
    lineHeight: 1.5,
    marginBottom: 24,
  },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  primaryBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "1px solid var(--border-medium)",
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  },
};
