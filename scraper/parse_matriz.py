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
            # Coleta marcadores de período com posição Y para ordenação
            # Cada marcador: (y, periodo_int_or_None)
            markers: list[tuple[float, int | None]] = []

            words = page.extract_words()
            page_text_items = []
            for w in words:
                page_text_items.append(w)

            # Busca headers de período por posição Y
            full_text = page.extract_text() or ""
            for m in PERIOD_RE.finditer(full_text):
                periodo_val = int(m.group(1))
                # Localiza a posição Y buscando a palavra do período no PDF
                keyword = m.group(0).split()[0]  # ex: "7º"
                for w in words:
                    if keyword in w["text"]:
                        markers.append((w["top"], periodo_val))
                        break

            # Busca "Não periodizada" por posição Y
            nao_period_re = re.compile(r"[Nn]ão\s+periodizada|N.o\s+periodizada")
            for w in words:
                if nao_period_re.search(w["text"]):
                    markers.append((w["top"], None))
                    break
            # Fallback: check combined text for "Não periodizada"
            if not any(v is None for _, v in markers):
                if "Não periodizada" in full_text or "N\udce3o periodizada" in full_text:
                    # Tenta achar a posição Y via busca de "periodizada"
                    for w in words:
                        if "periodizada" in w["text"].lower():
                            markers.append((w["top"], None))
                            break

            # Ordena marcadores por posição Y (topo → baixo)
            markers.sort(key=lambda x: x[0])

            # Extrai tabelas com bounding boxes para saber posição Y das linhas
            table_settings = {}
            found_tables = page.find_tables(table_settings)
            extracted_tables = page.extract_tables(table_settings)

            for t_idx, (tbl_obj, table) in enumerate(
                zip(found_tables, extracted_tables)
            ):
                bbox = tbl_obj.bbox  # (x0, top, x1, bottom)
                row_count = len(table) if table else 0
                if row_count == 0:
                    continue

                # Estima posição Y de cada linha distribuindo uniformemente
                tbl_top = bbox[1]
                tbl_bottom = bbox[3]
                row_height = (tbl_bottom - tbl_top) / row_count

                for row_idx, row in enumerate(table):
                    if not row or not row[0]:
                        continue

                    codigo = row[0].strip()
                    if not CODE_RE.match(codigo):
                        continue

                    row_y = tbl_top + row_idx * row_height

                    # Determina período desta linha baseado nos marcadores
                    # Usa o último marcador com Y <= row_y, ou herda da página anterior
                    periodo_for_row = current_periodo
                    for marker_y, marker_val in markers:
                        if marker_y <= row_y:
                            periodo_for_row = marker_val
                        else:
                            break

                    nome = (row[1] or "").strip()
                    nome = re.sub(r"\s*[\n\r]+\s*", " ", nome).strip()
                    tipo_raw = (row[2] or "").strip()
                    tipo = "obrigatoria" if tipo_raw == "OB" else "optativa"

                    prereq_col = row[9] or ""
                    prereqs = list(
                        dict.fromkeys(PREREQ_CODE_RE.findall(prereq_col))
                    )

                    all_disciplinas.append(
                        {
                            "codigo": codigo,
                            "nome": nome,
                            "periodo": periodo_for_row,
                            "tipo": tipo,
                            "prerequisitos": prereqs,
                        }
                    )

            # Atualiza current_periodo para a próxima página
            # Usa o último marcador da página atual
            if markers:
                current_periodo = markers[-1][1]

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
