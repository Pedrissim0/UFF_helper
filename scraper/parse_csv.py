"""
parse_csv.py — converte CSV para web/data/materias.json
seguindo o contrato de dados definido em CLAUDE.md.
"""

import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).parent.parent
DIAS = ["seg", "ter", "qua", "qui", "sex", "sab"]


def parse_row(row: dict) -> dict:
    horarios = {dia: row[col].strip() for dia, col in zip(DIAS, ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"])}
    return {
        "codigo": row["Código"].strip(),
        "nome": row["Nome"].strip(),
        "turma": row["Turma"].strip(),
        "professor": row.get("Professor", "").strip(),
        "ch": None,
        "link": row.get("Link para disciplina", "").strip(),
        "horarios": horarios,
    }


def run(csv_path=None, out_path=None):
    """Converte CSV em JSON. Se paths não forem fornecidos, usa defaults."""
    if csv_path is None:
        csv_path = ROOT / "docs" / "amostra.csv"
    else:
        csv_path = pathlib.Path(csv_path)

    if out_path is None:
        out_path = ROOT / "web" / "data" / "materias.json"
    else:
        out_path = pathlib.Path(out_path)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    materias = []
    with csv_path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            # ignora linhas em branco
            if not row.get("Código", "").strip():
                continue
            materias.append(parse_row(row))

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(materias, f, ensure_ascii=False, indent=2)

    print(f"OK — {len(materias)} matérias escritas em {out_path}")


def main():
    run()


if __name__ == "__main__":
    main()
