"use client";

import React, { useState, useCallback, useRef } from "react";
import styles from "./DisciplineDetailModal.module.css";
import roadmapStyles from "./Roadmap.module.css";
import { formatarNomeDisciplina } from "@/lib/formatarNomeDisciplina";
import { calcularEstadoDisciplina } from "@/lib/calcularEstadoDisciplina";
import { hashFile } from "@/lib/hashFile";
import type { DisciplinaData } from "@/hooks/useRoadmapConnections";
import type { FileMetadata, FileType } from "@/types/discipline-files";

// Static disc lookup — imported from curriculo
import curriculoRaw from "@/data/curriculo.json";
import type { PeriodoData } from "@/hooks/useRoadmapConnections";

const periodos = curriculoRaw.periodos as PeriodoData[];
const discMap = new Map<string, DisciplinaData>();
for (const p of periodos) {
  for (const d of p.disciplinas) {
    discMap.set(d.codigo, d);
  }
}

interface Props {
  disc: DisciplinaData;
  approvedSet: Set<string>;
  aprovadas: string[];
  files: FileMetadata[];
  professors: string[];
  onClose: () => void;
}

type Tab = "info" | "materiais";
type UploadState = "idle" | "hashing" | "uploading" | "success" | "error";

const FILE_TYPE_LABELS: Record<string, string> = {
  prova: "Prova",
  lista: "Lista",
  resumo: "Resumo",
  apostila: "Apostila",
  vs: "VS",
};

const PROVA_LABEL_RE = /^P\d+\s*-\s*.+$/;

const REPORT_REASONS = [
  "Arquivo duplicado",
  "Disciplina ou professor errado",
  "Conteúdo ilegível ou corrompido",
  "Arquivo em branco",
  "Não é material acadêmico",
  "Informação desatualizada",
  "Outro",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DisciplineDetailModal({
  disc,
  approvedSet,
  aprovadas,
  files: initialFiles,
  professors,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [localFiles, setLocalFiles] = useState<FileMetadata[]>(initialFiles);

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [fileType, setFileType] = useState<FileType>("prova");
  const [label, setLabel] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [professorNome, setProfessorNome] = useState(professors[0] ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Report state
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [reportMenuId, setReportMenuId] = useState<string | null>(null);
  const [reportMenuPos, setReportMenuPos] = useState({ top: 0, right: 0 });
  const reportBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Filter by professor
  const [filterProf, setFilterProf] = useState<string>("");

  const filteredFiles = filterProf
    ? localFiles.filter((f) => f.professor_nome === filterProf)
    : localFiles;

  const isProvaLabelValid = fileType !== "prova" || PROVA_LABEL_RE.test(label.trim());

  const canSubmit =
    selectedFile &&
    professorNome &&
    uploadState !== "hashing" &&
    uploadState !== "uploading" &&
    isProvaLabelValid &&
    (fileType !== "prova" || label.trim().length > 0);

  const handleUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedFile || !professorNome) return;

      if (fileType === "prova" && !PROVA_LABEL_RE.test(label.trim())) {
        setUploadError('Para provas, use o formato "P1 - Nome da Disciplina".');
        return;
      }

      setUploadError("");
      setUploadState("hashing");

      try {
        const fileHash = await hashFile(selectedFile);
        setUploadState("uploading");

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("disciplina_codigo", disc.codigo);
        formData.append("file_type", fileType);
        formData.append(
          "label",
          label.trim() || `${FILE_TYPE_LABELS[fileType]} — ${disc.codigo}`
        );
        formData.append("file_hash", fileHash);
        formData.append("professor_nome", professorNome);
        if (periodo.trim()) formData.append("periodo", periodo.trim());

        const res = await fetch("/api/discipline-files", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setUploadError(data.error || "Erro ao enviar arquivo.");
          setUploadState("error");
          return;
        }

        // Add optimistically
        setLocalFiles((prev) => [data, ...prev]);
        setUploadState("success");
        setSelectedFile(null);
        setLabel("");
        setPeriodo("");

        setTimeout(() => setUploadState("idle"), 3000);
      } catch {
        setUploadError("Erro de conexão.");
        setUploadState("error");
      }
    },
    [selectedFile, disc.codigo, fileType, label, periodo, professorNome]
  );

  const handleReport = useCallback(
    async (fileId: string, reason: string) => {
      if (reportedIds.has(fileId)) return;
      setReportMenuId(null);
      setReportedIds((prev) => new Set(prev).add(fileId));

      try {
        const res = await fetch(`/api/discipline-files/${fileId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });

        if (!res.ok) {
          setReportedIds((prev) => {
            const next = new Set(prev);
            next.delete(fileId);
            return next;
          });
        }
      } catch {
        setReportedIds((prev) => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }
    },
    [reportedIds]
  );

  const estado = calcularEstadoDisciplina(disc.codigo, disc.pre_requisitos, aprovadas);

  return (
    <div
      className={roadmapStyles.modalBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${formatarNomeDisciplina(disc.nome)}`}
    >
      <div className={roadmapStyles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <button
          className={roadmapStyles.modalClose}
          onClick={onClose}
          aria-label="Fechar"
          title="Fechar"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className={roadmapStyles.modalNome}>{formatarNomeDisciplina(disc.nome)}</h2>
        <p className={roadmapStyles.modalCodigo}>{disc.codigo}</p>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${tab === "info" ? styles.tabActive : ""}`}
            onClick={() => setTab("info")}
          >
            Informações
          </button>
          <button
            className={`${styles.tab} ${tab === "materiais" ? styles.tabActive : ""}`}
            onClick={() => setTab("materiais")}
          >
            Materiais{localFiles.length > 0 ? ` (${localFiles.length})` : ""}
          </button>
        </div>

        {/* ── Tab: Informações ── */}
        {tab === "info" && (
          <>
            <div className={roadmapStyles.modalMeta}>
              <span className={roadmapStyles.modalCH}>{disc.carga_horaria}h</span>
              {estado === "aprovado" && (
                <span className={`${roadmapStyles.badge} ${roadmapStyles.badgeAprovado}`}>
                  Aprovado
                </span>
              )}
              {estado === "desbloqueado" && (
                <span
                  className={`${roadmapStyles.badge} ${roadmapStyles.badgeDesbloqueado}`}
                >
                  Desbloqueado
                </span>
              )}
              {estado === "bloqueado" && (
                <span
                  className={`${roadmapStyles.badge} ${roadmapStyles.badgeBloqueado}`}
                >
                  Bloqueado
                </span>
              )}
              {!disc.obrigatoria && (
                <span className={`${roadmapStyles.badge} ${roadmapStyles.badgeOptativa}`}>
                  Optativa
                </span>
              )}
            </div>

            {disc.pre_requisitos.length > 0 ? (
              <div className={roadmapStyles.modalSection}>
                <h3 className={roadmapStyles.modalSectionTitle}>Pré-requisitos</h3>
                <ul className={roadmapStyles.modalPrereqList}>
                  {disc.pre_requisitos.map((code) => {
                    const d = discMap.get(code);
                    const isAprov = approvedSet.has(code);
                    return (
                      <li key={code} className={roadmapStyles.modalPrereqItem}>
                        <span
                          className={
                            isAprov
                              ? roadmapStyles.modalPrereqDone
                              : roadmapStyles.modalPrereqPending
                          }
                          aria-label={isAprov ? "Aprovado" : "Pendente"}
                        >
                          {isAprov ? "✓" : "○"}
                        </span>
                        <span className={roadmapStyles.modalPrereqNome}>
                          {d ? formatarNomeDisciplina(d.nome) : code}
                        </span>
                        <span className={roadmapStyles.modalPrereqCode}>{code}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className={roadmapStyles.modalSection}>
                <p className={roadmapStyles.modalNoPrereq}>
                  Sem pré-requisitos — disponível a qualquer momento.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Materiais ── */}
        {tab === "materiais" && (
          <div className={styles.materiaisContent}>
            {/* Professor filter */}
            {professors.length > 1 && (
              <div className={styles.filterRow}>
                <label className={styles.filterLabel}>Filtrar professor:</label>
                <select
                  className={styles.filterSelect}
                  value={filterProf}
                  onChange={(e) => setFilterProf(e.target.value)}
                >
                  <option value="">Todos</option>
                  {professors.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filteredFiles.length > 0 ? (
              <ul className={styles.fileList}>
                {filteredFiles.map((f) => (
                  <li key={f.id} className={styles.fileItem}>
                    <span className={styles.fileTypeBadge} data-type={f.file_type}>
                      {FILE_TYPE_LABELS[f.file_type] || f.file_type}
                    </span>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileLabel}>
                        {f.periodo ? `${f.periodo} — ${f.label}` : f.label}
                      </span>
                      <span className={styles.fileMeta}>
                        {f.professor_nome && `${f.professor_nome} · `}
                        {formatBytes(f.file_size)} · {f.downloads_count} downloads
                      </span>
                    </div>
                    <div className={styles.fileActions}>
                      <a
                        href={`/api/discipline-files/${f.id}`}
                        className={styles.downloadBtn}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Baixar"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                      {reportedIds.has(f.id) ? (
                        <span className={styles.reportBtnDone} title="Reportado">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="none"
                          >
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <line
                              x1="4"
                              y1="22"
                              x2="4"
                              y2="15"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                        </span>
                      ) : (
                        <button
                          className={styles.reportBtn}
                          ref={(el) => {
                            if (el) reportBtnRefs.current.set(f.id, el);
                          }}
                          onClick={() => {
                            if (reportMenuId === f.id) {
                              setReportMenuId(null);
                              return;
                            }
                            const btn = reportBtnRefs.current.get(f.id);
                            if (btn) {
                              const rect = btn.getBoundingClientRect();
                              setReportMenuPos({
                                top: rect.top,
                                right: window.innerWidth - rect.right,
                              });
                            }
                            setReportMenuId(f.id);
                          }}
                          title="Reportar"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <line x1="4" y1="22" x2="4" y2="15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMsg}>
                {filterProf
                  ? "Nenhum material deste professor."
                  : "Nenhum material disponível. Seja o primeiro a compartilhar!"}
              </p>
            )}

            {/* Upload form */}
            <form className={styles.uploadForm} onSubmit={handleUpload}>
              <h3 className={styles.uploadTitle}>Enviar material</h3>

              {/* Row 1: Tipo + Professor */}
              <div className={styles.uploadRow}>
                <select
                  className={styles.uploadSelect}
                  value={fileType}
                  onChange={(e) => {
                    setFileType(e.target.value as FileType);
                    setUploadError("");
                  }}
                >
                  <option value="prova">Prova</option>
                  <option value="lista">Lista</option>
                  <option value="resumo">Resumo</option>
                  <option value="apostila">Apostila</option>
                  <option value="vs">VS</option>
                </select>
                <select
                  className={styles.uploadSelect}
                  style={{ flex: 1 }}
                  value={professorNome}
                  onChange={(e) => setProfessorNome(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Professor...
                  </option>
                  {professors.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2: Período + Label */}
              <div className={styles.uploadRow}>
                <input
                  className={styles.uploadInputSmall}
                  type="text"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  placeholder="2026.1"
                  maxLength={6}
                />
                <input
                  className={styles.uploadInput}
                  type="text"
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    setUploadError("");
                  }}
                  placeholder={
                    fileType === "prova" ? "P1 - Econometria I" : "Descrição do material"
                  }
                  maxLength={100}
                  required={fileType === "prova"}
                />
              </div>

              {/* Prova format hint */}
              {fileType === "prova" && label.trim().length > 0 && !isProvaLabelValid && (
                <p className={styles.hintMsg}>
                  Formato obrigatório: P1 - Nome da Disciplina
                </p>
              )}

              {/* Row 3: File + Submit */}
              <div className={styles.uploadRow}>
                <label className={styles.uploadFileLabel}>
                  <input
                    type="file"
                    accept=".pdf"
                    className={styles.uploadFileInput}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <span className={styles.uploadFileTrigger}>
                    {selectedFile ? selectedFile.name : "Escolher PDF..."}
                  </span>
                </label>
                <button type="submit" className={styles.uploadBtn} disabled={!canSubmit}>
                  {uploadState === "hashing"
                    ? "Verificando..."
                    : uploadState === "uploading"
                      ? "Enviando..."
                      : "Enviar"}
                </button>
              </div>

              {uploadState === "success" && (
                <p className={styles.successMsg}>Material enviado com sucesso!</p>
              )}
              {(uploadState === "error" || uploadError) && (
                <p className={styles.errorMsg}>{uploadError}</p>
              )}
            </form>
          </div>
        )}
        {/* ── Report menu (fixed, above everything) ── */}
        {reportMenuId && (
          <>
            <div
              className={styles.reportBackdrop}
              onClick={() => setReportMenuId(null)}
            />
            <ul
              className={styles.reportMenu}
              style={{
                top: reportMenuPos.top,
                right: reportMenuPos.right,
                transform: "translateY(-100%)",
              }}
            >
              <li className={styles.reportMenuTitle}>Motivo da denúncia</li>
              {REPORT_REASONS.map((reason) => (
                <li key={reason}>
                  <button
                    className={styles.reportMenuItem}
                    onClick={() => handleReport(reportMenuId, reason)}
                  >
                    {reason}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
