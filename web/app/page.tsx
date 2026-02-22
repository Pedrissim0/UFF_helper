import fs from "fs";
import path from "path";
import GradeHoraria from "./components/GradeHoraria";

export interface Materia {
  codigo: string;
  nome: string;
  turma: string;
  professor: string;
  modulo: number;
  tipo: string;
  link: string;
  horarios: {
    seg: string;
    ter: string;
    qua: string;
    qui: string;
    sex: string;
    sab: string;
  };
}

export default function Home() {
  const filePath = path.join(process.cwd(), "data", "materias.json");
  const materias: Materia[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  return <GradeHoraria materias={materias} />;
}
