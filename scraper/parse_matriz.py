"""
parse_matriz.py — extrai dados da Matriz Curricular (PDF) para JSON.
Usa pdfplumber.extract_tables() para parse limpo de colunas estruturadas.
Gera docs/matriz_curricular/matriz_curricular.json com codigo, nome,
periodo, tipo (obrigatoria/optativa) e prerequisitos de cada disciplina.
"""

import json
import re
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent.parent

CODE_RE = re.compile(r"^[A-Z]{2,3}\d{5}$")
PREREQ_CODE_RE = re.compile(
    r"\[(?:\d+|Não Periodizada)\s*-\s*([A-Z]{2,3}\d{5})\]"
)
PERIOD_RE = re.compile(r"(\d+)[ºo°]\s*per[ií]odo", re.IGNORECASE)


def run():
    pdf_path = (
        ROOT
        / "docs"
        / "matriz_curricular"
        / "MatrizCurricular2026_1771898812687.pdf"
    )
    out_path = ROOT / "docs" / "matriz_curricular" / "matriz_curricular.json"

    try:
        import pdfplumber
    except ImportError:
        print("ERRO: pdfplumber nao instalado. Rode: pip install pdfplumber")
        sys.exit(1)

    print(f"  Lendo {pdf_path.name}...")

    all_disciplinas = []
    current_periodo = None

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            text = page.extract_text() or ""

            # Detecta período no texto da página
            period_match = PERIOD_RE.search(text)
            if period_match:
                current_periodo = int(period_match.group(1))

            # Detecta seção "Não periodizada" (optativas)
            if "Não periodizada" in text or "N�o periodizada" in text:
                current_periodo = None

            # Extrai tabelas da página
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Pula linhas vazias ou cabeçalhos
                    if not row or not row[0]:
                        continue

                    codigo = row[0].strip()

                    # Pula linhas que não começam com código disciplina
                    if not CODE_RE.match(codigo):
                        continue

                    # Pula linhas com apenas "Código" (header)
                    if codigo == "Código":
                        continue

                    # Parse dos campos
                    nome = (row[1] or "").strip()
                    # Remove quebras de linha do nome
                    nome = re.sub(r"\s*[\n\r]+\s*", " ", nome).strip()
                    tipo_raw = (row[2] or "").strip()

                    # Colunas 9 e 10 contêm pré-requisitos e co-requisitos
                    prereq_text = (row[9] or "") + " " + (row[10] or "")

                    # Determina tipo
                    tipo = "obrigatoria" if tipo_raw == "OB" else "optativa"

                    # Extrai códigos de pré-requisitos (coluna 9)
                    # Ignora co-requisitos (coluna 10)
                    prereq_col = row[9] or ""
                    prereqs = list(
                        dict.fromkeys(PREREQ_CODE_RE.findall(prereq_col))
                    )

                    all_disciplinas.append(
                        {
                            "codigo": codigo,
                            "nome": nome,
                            "periodo": current_periodo,
                            "tipo": tipo,
                            "prerequisitos": prereqs,
                        }
                    )

    # Deduplica por código (mantém primeira ocorrência)
    seen = set()
    unique = []
    for d in all_disciplinas:
        if d["codigo"] not in seen:
            seen.add(d["codigo"])
            unique.append(d)

    # Salva resultado
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)

    obr = sum(1 for d in unique if d["tipo"] == "obrigatoria")
    opt = sum(1 for d in unique if d["tipo"] == "optativa")
    print(f"  {len(unique)} disciplinas ({obr} obrig., {opt} opt.) -> {out_path.name}")

    return unique


def main():
    run()


if __name__ == "__main__":
    main()
