import fs from "fs";
import path from "path";
import GradeHoraria from "./components/GradeHoraria";

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
  nome_exibicao: string;
  apelido: string | null;
}

export default function Home() {
  const filePath = path.join(process.cwd(), "data", "db_disciplinas.json");
  const materias: Materia[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const apelidosPath = path.join(process.cwd(), "data", "nomes_professores.json");
  const apelidosList: ApelidoEntry[] = JSON.parse(fs.readFileSync(apelidosPath, "utf-8"));
  const apelidosMap = new Map<string, string>();
  for (const entry of apelidosList) {
    if (entry.apelido) {
      apelidosMap.set(entry.nome_exibicao, entry.apelido);
    }
  }

  for (const m of materias) {
    const apelido = apelidosMap.get(m.nome_exibicao);
    if (apelido) {
      m.nome_exibicao = apelido;
    }
  }

  return <GradeHoraria materias={materias} />;
}
