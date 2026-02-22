"""
scrape_ch.py — busca a Carga Horária Total (CH) de cada disciplina em seu link individual.

As páginas de turma são públicas — não requerem autenticação.

Estrutura HTML alvo:
  <dt class="col-4">CH <span title="...total">Total</span></dt>
  <dd class="col-8">240</dd>

Fluxo:
  1. Lê web/data/materias.json e deduplica links
  2. Para cada link único, faz GET com requests e parseia CH Total com BeautifulSoup
  3. Atualiza cada entrada do JSON com "ch": <valor inteiro ou None>
  4. Salva o JSON atualizado

Interface:
  run(json_path=None)  <- chamável pelo pipeline (scrape_uff.py)
  main()               <- entry point standalone
"""

import json
import pathlib
import time

import requests
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).parent.parent
DEFAULT_JSON = ROOT / "web" / "data" / "materias.json"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0"})


def _parse_ch(html: str) -> int | None:
    """Extrai a CH Total da página individual de uma turma.

    Procura o <dt> que contenha texto "CH" e um <span> cujo title inclua
    "total", depois lê o valor inteiro do <dd> seguinte.
    """
    soup = BeautifulSoup(html, "html.parser")

    for dt in soup.find_all("dt"):
        spans = dt.find_all("span")
        dt_text = dt.get_text(" ", strip=True)
        if not dt_text.startswith("CH"):
            continue
        if any("total" in s.get("title", "").lower() for s in spans):
            dd = dt.find_next_sibling("dd")
            if dd:
                val = dd.get_text(strip=True)
                if val.isdigit():
                    return int(val)

    return None


def run(json_path=None, **_kwargs):
    """Busca CH Total de cada link único e atualiza materias.json."""
    if json_path is None:
        json_path = DEFAULT_JSON
    else:
        json_path = pathlib.Path(json_path)

    with json_path.open(encoding="utf-8") as f:
        materias = json.load(f)

    links_unicos = list({m["link"] for m in materias if m.get("link")})
    print(f"  {len(links_unicos)} links unicos para consultar...")

    if not links_unicos:
        print("  Nenhum link encontrado - CH permanece null.")
        return

    ch_map: dict[str, int | None] = {}
    for i, link in enumerate(links_unicos, 1):
        try:
            resp = SESSION.get(link, timeout=15)
            ch = _parse_ch(resp.text)
        except Exception as e:
            print(f"  [{i}/{len(links_unicos)}] ERRO em {link}: {e}")
            ch = None
        ch_map[link] = ch
        print(f"  [{i}/{len(links_unicos)}] CH={ch}  {link}")
        time.sleep(0.2)

    for m in materias:
        link = m.get("link", "")
        if link in ch_map:
            m["ch"] = ch_map[link]

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(materias, f, ensure_ascii=False, indent=2)

    encontrados = sum(1 for v in ch_map.values() if v is not None)
    print(f"  CH atualizada: {encontrados}/{len(links_unicos)} encontrados.")


def main():
    run()


if __name__ == "__main__":
    main()
