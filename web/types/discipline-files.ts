export type FileType = "prova" | "lista" | "resumo" | "apostila" | "vs";

export interface FileMetadata {
  id: string;
  disciplina_codigo: string;
  file_type: FileType;
  label: string;
  file_size: number;
  downloads_count: number;
  periodo: string | null;
  professor_nome: string | null;
  created_at: string;
}

export type FilesMap = Record<string, FileMetadata[]>;

// Map: disciplina_codigo → list of professor display names
export type ProfessorsPerDiscMap = Record<string, string[]>;
