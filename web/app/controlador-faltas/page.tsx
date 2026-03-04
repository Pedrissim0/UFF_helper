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

  return (
    <ControladorFaltas
      nomeCompletoMap={nomeCompletoMap}
      professorEmailMap={professorEmailMap}
    />
  );
}
