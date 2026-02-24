"""
enrich_materias.py — enriquece web/data/materias.json com dados da matriz curricular.
Adiciona periodo, tipo (obrigatoria/optativa) e prerequisitos a cada matéria.
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent.parent


def run():
    """Lê matriz_curricular.json e enriquece materias.json."""
    web_json = ROOT / "web" / "data" / "materias.json"
    matriz_json = ROOT / "docs" / "matriz_curricular" / "matriz_curricular.json"

    print(f"  Lendo {web_json.name}...")
    with web_json.open(encoding="utf-8") as f:
        materias = json.load(f)

    print(f"  Lendo {matriz_json.name}...")
    if not matriz_json.exists():
        print(
            f"ERRO: {matriz_json} não encontrado. "
            "Execute parse_matriz.py primeiro."
        )
        sys.exit(1)

    with matriz_json.open(encoding="utf-8") as f:
        matriz = json.load(f)

    # Cria índice por código para lookup rápido
    matriz_map = {d["codigo"]: d for d in matriz}

    # Merge: adiciona periodo, tipo, prerequisitos a cada matéria
    enriquecidas = 0
    sem_match = 0

    for m in materias:
        codigo = m["codigo"]
        if codigo in matriz_map:
            d = matriz_map[codigo]
            m["periodo"] = d["periodo"]
            m["tipo"] = d["tipo"]
            m["prerequisitos"] = d["prerequisitos"]
            enriquecidas += 1
        else:
            # Padrão para matérias não encontradas na matriz
            m["periodo"] = None
            m["tipo"] = "optativa"
            m["prerequisitos"] = []
            sem_match += 1

    # Salva resultado
    with web_json.open("w", encoding="utf-8") as f:
        json.dump(materias, f, ensure_ascii=False, indent=2)

    print(
        f"  {len(materias)} matérias enriquecidas "
        f"({enriquecidas} com match, {sem_match} sem match)"
    )
    print(f"  Salvo em {web_json.name}")

    return materias


def main():
    run()


if __name__ == "__main__":
    main()
