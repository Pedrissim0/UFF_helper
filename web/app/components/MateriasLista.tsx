"use client";

import { useState } from "react";
import type { Materia } from "../page";
import styles from "./MateriasLista.module.css";

type Dia = keyof Materia["horarios"];

const DIAS: Dia[] = ["seg", "ter", "qua", "qui", "sex", "sab"];
const DIAS_LABEL: Record<Dia, string> = {
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
};

interface Props {
  materias: Materia[];
}

export default function MateriasLista({ materias }: Props) {
  const [busca, setBusca] = useState("");
  const [diasFiltro, setDiasFiltro] = useState<Set<Dia>>(new Set());

  function toggleDia(dia: Dia) {
    setDiasFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) {
        next.delete(dia);
      } else {
        next.add(dia);
      }
      return next;
    });
  }

  const termo = busca.toLowerCase().trim();

  const filtradas = materias.filter((m) => {
    if (
      termo &&
      !m.nome.toLowerCase().includes(termo) &&
      !m.codigo.toLowerCase().includes(termo)
    ) {
      return false;
    }
    if (diasFiltro.size > 0) {
      const temDia = Array.from(diasFiltro).some((dia) => Boolean(m.horarios[dia]));
      if (!temDia) return false;
    }
    return true;
  });

  const filtrosAtivos = diasFiltro.size > 0 || termo.length > 0;

  return (
    <div>
      <div className={styles.controles}>
        <div className={styles.buscaWrapper}>
          <input
            className={styles.busca}
            type="search"
            placeholder="Buscar por nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className={styles.filtrosDia}>
          <span className={styles.filtroLabel}>Dia:</span>
          {DIAS.map((dia) => (
            <button
              key={dia}
              className={`${styles.diaBtn} ${diasFiltro.has(dia) ? styles.diaBtnAtivo : ""}`}
              onClick={() => toggleDia(dia)}
              aria-pressed={diasFiltro.has(dia)}
            >
              {DIAS_LABEL[dia]}
            </button>
          ))}
          {diasFiltro.size > 0 && (
            <button
              className={styles.limparBtn}
              onClick={() => setDiasFiltro(new Set())}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <p className={styles.contador}>
        {filtradas.length} de {materias.length} matérias
        {filtrosAtivos && " (filtradas)"}
      </p>

      <ul className={styles.lista}>
        {filtradas.map((m, i) => (
          <li key={`${m.codigo}-${m.turma}-${i}`} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.codigo}>{m.codigo}</span>
              <span className={styles.turma}>Turma {m.turma}</span>
            </div>
            <h2 className={styles.nome}>
              {m.link ? (
                <a href={m.link} target="_blank" rel="noopener noreferrer" className={styles.nomeLink}>
                  {m.nome}
                </a>
              ) : (
                m.nome
              )}
            </h2>
            <div className={styles.meta}>
              <span className={styles.modulo}>{m.ch != null ? `${m.ch}h` : "—"}</span>
              {m.professor && <span className={styles.professor}>{m.professor}</span>}
            </div>
            <div className={styles.horarios}>
              {DIAS.map((dia) => {
                const hora = m.horarios[dia];
                if (!hora) return null;
                return (
                  <span
                    key={dia}
                    className={`${styles.horario} ${diasFiltro.has(dia) ? styles.horarioDestaque : ""}`}
                  >
                    <strong>{DIAS_LABEL[dia]}</strong> {hora}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {filtradas.length === 0 && (
        <p className={styles.vazio}>Nenhuma matéria encontrada.</p>
      )}
    </div>
  );
}
