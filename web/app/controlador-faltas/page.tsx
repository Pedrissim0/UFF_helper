import fs from "fs";
import path from "path";
import { supabase } from "@/lib/supabase";
import ControladorFaltas from "./ControladorFaltas";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Controlador de Faltas · UFF",
  description: "Acompanhe suas faltas por disciplina e saiba quando está perto do limite",
};

interface ApelidoEntry {
  docente: string;
  nome_exibicao: string;
  apelido: string | null;
}

export default async function ControladorFaltasPage() {
  const apelidosPath = path.join(process.cwd(), "data", "nomes_professores.json");
  const apelidosList: ApelidoEntry[] = JSON.parse(fs.readFileSync(apelidosPath, "utf-8"));
  const nomeCompletoMap: Record<string, string> = {};
  for (const entry of apelidosList) {
    nomeCompletoMap[entry.nome_exibicao] = entry.docente;
    if (entry.apelido) {
      nomeCompletoMap[entry.apelido] = entry.docente;
    }
  }

  const { data: profData } = await supabase.from("professors").select("name, email");
  const professorEmailMap: Record<string, string> = {};
  if (profData) {
    for (const prof of profData) {
      if (prof.email) professorEmailMap[prof.name] = prof.email;
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
    <ControladorFaltas
      nomeCompletoMap={nomeCompletoMap}
      professorEmailMap={professorEmailMap}
      difficultyMap={difficultyMap}
    />
  );
}
