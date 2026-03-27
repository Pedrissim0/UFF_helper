import React, { useCallback, useRef } from "react";
import styles from "../CalculadoraCR.module.css";
import { UploadIcon } from "./Icons";
import type { Disciplina } from "../types";
import { parseNum, normalizeSem } from "../types";
import { useCalculadoraStore } from "@/stores/useCalculadoraStore";
import { DisciplinaUploadSchema } from "@/lib/schemas";

interface UploadAreaProps {
  disciplinas: Disciplina[];
  onLoaded: () => void;
  onError: (msg: string) => void;
  onClear: () => void;
}

export default function UploadArea({
  disciplinas,
  onLoaded,
  onError,
  onClear,
}: UploadAreaProps) {
  const calcStore = useCalculadoraStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setCarregando(true);
      onError("");

      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        let rows: unknown[][] = [];

        if (ext === "csv") {
          const Papa = (await import("papaparse")).default;
          const text = await file.text();
          const result = Papa.parse<unknown[]>(text, {
            skipEmptyLines: true,
            dynamicTyping: false,
            delimiter: "",
          });
          rows = result.data;
        } else if (ext === "xlsx" || ext === "xls") {
          const XLSXMod = await import("xlsx");
          const XLSX = XLSXMod.default ?? XLSXMod;
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        } else {
          onError("Formato não suportado. Use .csv ou .xlsx.");
          return;
        }

        const data: Disciplina[] = [];
        let ignoradas = 0;

        for (const row of rows.slice(1)) {
          const raw = {
            codigo: String(row[0] ?? "").trim(),
            nome: String(row[1] ?? "").trim(),
            situacao: String(row[2] ?? "").trim(),
            turma: String(row[3] ?? "").trim(),
            nota: parseNum(row[4]),
            vs: parseNum(row[5]),
            frequencia: parseNum(row[6]),
            horas: parseNum(row[7]) ?? 0,
            creditos: parseNum(row[8]) ?? 0,
            semestre: normalizeSem(String(row[9] ?? "").trim()),
          };

          const result = DisciplinaUploadSchema.safeParse(raw);
          if (result.success) {
            data.push(raw);
          } else if (raw.codigo || raw.nome) {
            ignoradas++;
          }
        }

        if (data.length === 0) {
          onError(
            "Nenhuma disciplina encontrada. Verifique se o arquivo segue o formato esperado."
          );
          return;
        }

        const store = useCalculadoraStore.getState();
        store.setDisciplinas(data);
        store.setFonte("upload");
        onLoaded();

        if (ignoradas > 0) {
          onError(
            `${data.length} disciplinas carregadas, ${ignoradas} linha${ignoradas > 1 ? "s" : ""} ignorada${ignoradas > 1 ? "s" : ""} (dados inválidos).`
          );
        }
      } catch {
        onError("Erro ao processar arquivo. Verifique o formato e tente novamente.");
      } finally {
        setCarregando(false);
      }
    },
    [onLoaded, onError]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleRemover = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const msg =
        calcStore.fonte === "upload"
          ? "Remover o arquivo e limpar todas as disciplinas da tabela?"
          : "Limpar todas as disciplinas da tabela?";
      if (!window.confirm(msg)) return;
      onClear();
    },
    [calcStore.fonte, onClear]
  );

  const uploadCount = disciplinas.filter((d) => !d.isProjecao).length;

  return (
    <div
      className={[
        styles.uploadArea,
        dragOver ? styles.uploadAreaDragOver : "",
        disciplinas.length > 0 ? styles.uploadAreaCompact : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
      aria-label="Carregar arquivo de histórico"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileInput}
        style={{ display: "none" }}
      />
      {carregando ? (
        <span className={styles.uploadMsg}>Processando arquivo...</span>
      ) : uploadCount > 0 ? (
        <>
          <span className={styles.uploadMsg}>
            {uploadCount} disciplinas carregadas
            {calcStore.fonte === "upload" && " · clique para trocar arquivo"}
          </span>
          <button
            className={styles.btnRemoverArquivo}
            onClick={handleRemover}
            title={
              calcStore.fonte === "upload"
                ? "Remover arquivo e limpar dados"
                : "Limpar todas as disciplinas"
            }
          >
            × {calcStore.fonte === "upload" ? "Remover arquivo" : "Limpar disciplinas"}
          </button>
        </>
      ) : (
        <>
          <span className={styles.uploadIconWrap}>
            <UploadIcon />
          </span>
          <span className={styles.uploadMsg}>
            Arraste seu histórico ou clique para selecionar
          </span>
          <span className={styles.uploadHint}>
            .csv ou .xlsx · colunas: Código, Nome, Situação, Turma, Nota, VS, Frequência,
            Horas, Créditos, Semestre
          </span>
        </>
      )}
    </div>
  );
}
