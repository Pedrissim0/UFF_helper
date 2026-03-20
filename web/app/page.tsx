import Link from "next/link";
import { supabase } from "@/lib/supabase";
import NameContest from "./components/NameContest";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UFF Helper",
  description:
    "Grade horária, calculadora de CR, controlador de faltas e roadmap curricular para alunos de Economia da UFF.",
};

const features = [
  {
    href: "/grade",
    title: "Grade Horária",
    description: "Monte sua grade semanal com detecção de conflitos e co-requisitos.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="9" y1="4" x2="9" y2="22" />
        <line x1="15" y1="4" x2="15" y2="22" />
        <line x1="3" y1="16" x2="21" y2="16" />
      </svg>
    ),
  },
  {
    href: "/calculadora-cr",
    title: "Calculadora de CR",
    description: "Calcule seu Coeficiente de Rendimento com projeções por semestre.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="10" y2="10" />
        <line x1="14" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="10" y2="14" />
        <line x1="14" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="16" y2="18" />
      </svg>
    ),
  },
  {
    href: "/controlador-faltas",
    title: "Controlador de Faltas",
    description: "Acompanhe suas faltas por disciplina e saiba o limite restante.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/roadmap",
    title: "Roadmap Curricular",
    description: "Visualize a matriz curricular como fluxograma interativo.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="5" cy="6" r="2" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="5" cy="18" r="2" />
        <circle cx="12" cy="18" r="2" />
        <circle cx="19" cy="18" r="2" />
        <line x1="5" y1="8" x2="5" y2="16" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="19" y1="8" x2="19" y2="16" />
        <line x1="7" y1="6" x2="10" y2="6" />
        <line x1="14" y1="6" x2="17" y2="6" />
      </svg>
    ),
  },
];

export default async function HomePage() {
  const { data: suggestions } = await supabase
    .from("name_suggestions")
    .select("id, suggested_name, votes_count")
    .order("votes_count", { ascending: false });

  return (
    <div className={styles.wrapper}>
      <NameContest suggestions={suggestions ?? []} />
      <header className={styles.header}>
        <h1 className={styles.title}>Projeto UFF - Ainda sem nome</h1>
        <p className={styles.subtitle}>Ferramentas para alunos de Economia da UFF</p>
      </header>

      <main className={styles.grid}>
        {features.map((f) => (
          <Link key={f.href} href={f.href} className={styles.card}>
            <div className={styles.cardIcon}>{f.icon}</div>
            <h2 className={styles.cardTitle}>{f.title}</h2>
            <p className={styles.cardDescription}>{f.description}</p>
          </Link>
        ))}
      </main>
    </div>
  );
}
