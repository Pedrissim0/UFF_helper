import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import type {
  FilesMap,
  FileMetadata,
  ProfessorsPerDiscMap,
} from "@/types/discipline-files";

export const revalidate = 0;

const Roadmap = dynamic(() => import("./Roadmap"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh", background: "var(--bg-page)" }} />,
});

export const metadata = {
  title: "Roadmap Curricular",
  description:
    "Visualize a matriz curricular de Economia da UFF como fluxograma interativo.",
};

export default async function RoadmapPage() {
  const [{ data: filesData }, { data: discData }] = await Promise.all([
    supabase
      .from("discipline_files")
      .select(
        "id, disciplina_codigo, file_type, label, file_size, downloads_count, periodo, professor_nome, created_at"
      )
      .eq("flagged", false)
      .order("created_at", { ascending: false }),
    supabase.from("disciplinas").select("codigo, nome_exibicao").order("nome_exibicao"),
  ]);

  const filesMap: FilesMap = {};
  if (filesData) {
    for (const f of filesData as FileMetadata[]) {
      if (!filesMap[f.disciplina_codigo]) filesMap[f.disciplina_codigo] = [];
      filesMap[f.disciplina_codigo].push(f);
    }
  }

  // Build professors-per-discipline map (deduplicated)
  const professorsPerDisc: ProfessorsPerDiscMap = {};
  if (discData) {
    for (const row of discData as { codigo: string; nome_exibicao: string }[]) {
      if (!professorsPerDisc[row.codigo]) professorsPerDisc[row.codigo] = [];
      if (!professorsPerDisc[row.codigo].includes(row.nome_exibicao)) {
        professorsPerDisc[row.codigo].push(row.nome_exibicao);
      }
    }
  }

  return <Roadmap initialFilesMap={filesMap} professorsPerDisc={professorsPerDisc} />;
}
