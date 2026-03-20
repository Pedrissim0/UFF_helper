import fs from "fs";
import path from "path";
import GradeHoraria from "../components/GradeHoraria";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Grade Horária",
  description:
    "Monte sua grade de horários do curso de Economia da UFF de forma interativa.",
};

export interface Materia {
  codigo: string;
  nome: string;
  turma: string;
  nome_exibicao: string;
  ch: number | null;
  link: string;
  horarios: {
    seg: string;
    ter: string;
    qua: string;
    qui: string;
    sex: string;
    sab: string;
  };
  periodo: number | null;
  tipo: "obrigatoria" | "optativa";
  prerequisitos: string[];
  corequisitos?: string[];
}

interface ApelidoEntry {
  docente: string;
  nome_exibicao: string;
  apelido: string | null;
}

export default async function Home() {
  const { data, error } = await supabase.from("disciplinas").select("*").order("nome");

  if (error) throw new Error(`Supabase: ${error.message}`);

  const materias = data as Materia[];

  const apelidosPath = path.join(process.cwd(), "data", "nomes_professores.json");
  const apelidosList: ApelidoEntry[] = JSON.parse(fs.readFileSync(apelidosPath, "utf-8"));
  const apelidosMap = new Map<string, string>();
  const nomeCompletoMap: Record<string, string> = {};
  for (const entry of apelidosList) {
    nomeCompletoMap[entry.nome_exibicao] = entry.docente;
    if (entry.apelido) {
      apelidosMap.set(entry.nome_exibicao, entry.apelido);
      nomeCompletoMap[entry.apelido] = entry.docente;
    }
  }

  for (const m of materias) {
    const apelido = apelidosMap.get(m.nome_exibicao);
    if (apelido) {
      m.nome_exibicao = apelido;
    }
  }

  // Emails confirmados de professores
  const { data: profData } = await supabase.from("professors").select("name, email");

  const professorEmailMap: Record<string, string> = {};
  if (profData) {
    for (const prof of profData) {
      if (prof.email) {
        professorEmailMap[prof.name] = prof.email;
      }
    }
  }

  // Difficulty ratings
  const { data: diffData } = await supabase
    .from("difficulty_ratings")
    .select("professor_id, disciplina_codigo, rating, professors(name)");

  const difficultyMap: Record<string, { avg: number; count: number }> = {};
  if (diffData) {
    const buckets: Record<string, number[]> = {};
    for (const row of diffData) {
      const profName = (row.professors as unknown as { name: string } | null)?.name;
      if (!profName) continue;
      const key = `${profName}:${row.disciplina_codigo}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(row.rating);
    }
    for (const [key, ratings] of Object.entries(buckets)) {
      const sum = ratings.reduce((a, b) => a + b, 0);
      difficultyMap[key] = { avg: sum / ratings.length, count: ratings.length };
    }
  }

  return (
    <GradeHoraria
      materias={materias}
      nomeCompletoMap={nomeCompletoMap}
      professorEmailMap={professorEmailMap}
      difficultyMap={difficultyMap}
    />
  );
}
