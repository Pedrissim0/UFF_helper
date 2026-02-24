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

export default function Home() {
  const filePath = path.join(process.cwd(), "data", "db_disciplinas.json");
  const materias: Materia[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  return <GradeHoraria materias={materias} />;
}
