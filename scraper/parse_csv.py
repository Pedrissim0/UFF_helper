"""
parse_csv.py — converte docs/amostra.csv para web/data/materias.json
seguindo o contrato de dados definido em CLAUDE.md.
"""

import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).parent.parent
CSV_PATH = ROOT / "docs" / "amostra.csv"
OUT_PATH = ROOT / "web" / "data" / "materias.json"

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab"]


def parse_row(row: dict) -> dict:
    horarios = {dia: row[col].strip() for dia, col in zip(DIAS, ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"])}
    return {
        "codigo": row["Código"].strip(),
        "nome": row["Nome"].strip(),
        "turma": row["Turma"].strip(),
        "modulo": int(row["Módulo"].strip()),
        "tipo": row["Tipo de Oferta"].strip(),
        "horarios": horarios,
    }


def main():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    materias = []
    with CSV_PATH.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            # ignora linhas em branco
            if not row.get("Código", "").strip():
                continue
            materias.append(parse_row(row))

    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(materias, f, ensure_ascii=False, indent=2)

    print(f"OK — {len(materias)} matérias escritas em {OUT_PATH}")


if __name__ == "__main__":
    main()
