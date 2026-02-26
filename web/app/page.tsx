import fs from "fs";
import path from "path";
import GradeHoraria from "./components/GradeHoraria";
import { supabase } from "@/lib/supabase";

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
}

interface ApelidoEntry {
  docente: string;
  nome_exibicao: string;
  apelido: string | null;
}

export default async function Home() {
  const { data, error } = await supabase
    .from("disciplinas")
    .select("*")
    .order("nome");

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
  const { data: profData } = await supabase
    .from("professors")
    .select("name, email");

  const professorEmailMap: Record<string, string> = {};
  if (profData) {
    for (const prof of profData) {
      if (prof.email) {
        professorEmailMap[prof.name] = prof.email;
      }
    }
  }

  return (
    <GradeHoraria
      materias={materias}
      nomeCompletoMap={nomeCompletoMap}
      professorEmailMap={professorEmailMap}
    />
  );
}
