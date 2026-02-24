"""
scrape_ch.py — busca a Carga Horária Total (CH) e Docente de cada disciplina em seu link individual.

Requer autenticação via login e utiliza sessões de Cookies injetadas.
Otimizado através de multithreading (ThreadPoolExecutor) no módulo `requests` para saltar significativamente em performance.
"""

import json
import os
import pathlib
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).parent.parent
DEFAULT_JSON = ROOT / "web" / "data" / "materias.json"


def _parse_page(html: str) -> dict:
    """Extrai a CH Total e o Docente da página individual de uma turma."""
    soup = BeautifulSoup(html, "html.parser")
    
    result = {"ch": None, "docente": None}

    # Extract CH
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
                    result["ch"] = int(val)
                    break

    # Extract Docente
    tabela = soup.find("table", id="tabela-alteracao-professores-turma")
    if tabela:
        tbody = tabela.find("tbody")
        if tbody:
            tr = tbody.find("tr")
            if tr:
                tds = tr.find_all("td")
                if tds:
                    result["docente"] = tds[0].get_text(strip=True)

    return result


def fetch_and_parse(session, link):
    """Realiza o GET da URL e invoca o parser."""
    try:
        resp = session.get(link, timeout=15)
        # Check if the page redirected us to login indicating an expired/invalid session
        if "iduff" in resp.url.lower() or "login" in resp.url.lower() or "Acesso Negado" in resp.text:
            return link, {"ch": None, "docente": None, "error": "Sessão inválida/Expirada (Redirecionamento)."}
        
        data = _parse_page(resp.text)
        return link, data
    except Exception as e:
        return link, {"ch": None, "docente": None, "error": str(e)}


def run(json_path=None, cookies=None, **_kwargs):
    """Busca CH Total e Docente paralelizando as requisições autenticadas."""
    if json_path is None:
        json_path = DEFAULT_JSON
    else:
        json_path = pathlib.Path(json_path)

    # Load JSON
    if not json_path.exists():
        print(f"Erro: Arquivo não encontrado: {json_path}")
        return

    with json_path.open(encoding="utf-8") as f:
        materias = json.load(f)

    links_unicos = list({m["link"] for m in materias if m.get("link")})
    total_links = len(links_unicos)
    print(f"  [-] Identificados {total_links} links unicos para consultar.")

    if not total_links:
        print("  [x] Nenhum link - retornando.")
        return
        
    if not cookies:
        print("  [!] Aviso: Nenhum cookie de sessão fornecido. Algumas páginas como 'Docentes' podem falhar ou retornar vazio sem SSO.")

    # Configure the requests session using the fast requests module with Playwright's shared cookies
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    
    if cookies:
        for c in cookies:
            session.cookies.set(c['name'], c['value'], domain=c['domain'], path=c['path'])
            
    print(f"  [-] Inicializando pool de threads com max_workers=5 para scraping ágil (sutil) de {total_links} links...")
    data_map: dict[str, dict] = {}

    processed_count = 0
    encontrados_ch = 0
    encontrados_doc = 0

    with ThreadPoolExecutor(max_workers=5) as executor:
        # Submit all tasks
        future_to_link = {executor.submit(fetch_and_parse, session, link): link for link in links_unicos}
        
        # Re-assemble as they complete
        for future in as_completed(future_to_link):
            processed_count += 1
            link = future_to_link[future]
            try:
                link_result, data = future.result()
                data_map[link_result] = data
                
                ch_val = data.get('ch')
                doc_val = data.get('docente')
                err_val = data.get('error')
                
                if ch_val is not None: encontrados_ch += 1
                if doc_val is not None: encontrados_doc += 1
                
                print(f"    [{processed_count}/{total_links}] OK | CH: {str(ch_val):>3} | Prof: {str(doc_val)[:30]:<30} | {link}")
                if err_val:
                    print(f"      [!] Falha ao processar link ({err_val})")
            except Exception as exc:
                print(f"    [{processed_count}/{total_links}] LERRO | Exceção gerada na thread para {link}: {exc}")

    print("  [-] Atualizando base JSON com as novas métricas capturadas...")
    for m in materias:
        link = m.get("link", "")
        if link in data_map:
            if data_map[link]["ch"] is not None:
                m["ch"] = data_map[link]["ch"]
            
            docente = data_map[link]["docente"]
            if docente is not None:
                m["docente"] = docente
                
                # Formatar o nome do professor (Primeiro e Último Nome)
                partes_nome = docente.split()
                if len(partes_nome) > 1:
                    primeiro_nome = partes_nome[0].capitalize()
                    ultimo_nome = partes_nome[-1].capitalize()
                    m["professor"] = f"{primeiro_nome} {ultimo_nome}"
                elif len(partes_nome) == 1:
                    m["professor"] = partes_nome[0].capitalize()

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(materias, f, ensure_ascii=False, indent=2)

    print(f"  [OK] Cargas Horárias capturadas (total ou revalidadas): {encontrados_ch}/{total_links}.")
    print(f"  [OK] Perfis Docentes únicos capturados/validados: {encontrados_doc}/{total_links}.")


def main():
    run()

if __name__ == "__main__":
    main()
