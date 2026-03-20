import Link from "next/link";

export default function NotFound() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.code}>404</div>
        <h2 style={styles.title}>Página não encontrada</h2>
        <p style={styles.description}>
          A página que você procura não existe ou foi movida.
        </p>
        <Link href="/" style={styles.link}>
          ← Voltar ao início
        </Link>
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
  code: {
    fontSize: 64,
    fontWeight: 700,
    color: "var(--accent)",
    lineHeight: 1,
    marginBottom: 8,
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
  link: {
    display: "inline-block",
    padding: "10px 20px",
    borderRadius: 8,
    background: "var(--accent)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
  },
};
