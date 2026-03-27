import styles from "../CalculadoraCR.module.css";
import { PencilIcon, TrashIcon } from "./Icons";
import type { Disciplina } from "../types";
import { estaExcluida, eCovidReprovado, badgeClass } from "../types";

interface TabelaDisciplinasProps {
  disciplinas: Disciplina[];
  onEditar: (index: number) => void;
  onExcluir: (index: number) => void;
}

export default function TabelaDisciplinas({
  disciplinas,
  onEditar,
  onExcluir,
}: TabelaDisciplinasProps) {
  if (disciplinas.length === 0) return null;

  return (
    <div className={styles.gridWrapper}>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th>Código</th>
            <th className={styles.thNome}>Nome</th>
            <th className={styles.thNum}>Nota</th>
            <th className={styles.thNum}>VS</th>
            <th className={styles.thNum}>CH</th>
            <th>Situação</th>
            <th>Semestre</th>
            <th className={styles.thAcoes}></th>
          </tr>
        </thead>
        <tbody>
          {disciplinas.map((d, i) => (
            <tr
              key={i}
              className={[
                estaExcluida(d) || eCovidReprovado(d) ? styles.trExcluida : "",
                d.isProjecao ? styles.trProjecao : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <td className={styles.tdCode}>{d.codigo}</td>
              <td className={styles.tdNome}>
                {d.nome}
                {d.isProjecao && <span className={styles.tagProjecao}>projeção</span>}
              </td>
              <td className={`${styles.tdNum} ${styles.tdNota}`}>
                {d.nota !== null ? d.nota.toFixed(1) : "—"}
              </td>
              <td className={`${styles.tdNum} ${styles.tdVS}`}>
                {d.vs !== null ? d.vs.toFixed(1) : "—"}
              </td>
              <td className={`${styles.tdNum} ${styles.tdCH}`}>{d.horas || "—"}</td>
              <td className={styles.tdSituacao}>
                <span className={`${styles.badge} ${badgeClass(d.situacao, styles)}`}>
                  {d.situacao}
                </span>
              </td>
              <td className={styles.tdSemestre}>{d.semestre}</td>
              <td className={styles.tdAcoes}>
                <button
                  className={styles.btnIcone}
                  onClick={() => onEditar(i)}
                  title="Editar"
                  aria-label="Editar disciplina"
                >
                  <PencilIcon />
                </button>
                <button
                  className={`${styles.btnIcone} ${styles.btnIconeExcluir}`}
                  onClick={() => onExcluir(i)}
                  title="Remover"
                  aria-label="Remover disciplina"
                >
                  <TrashIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
