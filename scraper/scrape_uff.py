import os
import time
import csv
import json
import pathlib
import re
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import parse_csv

ROOT = pathlib.Path(__file__).parent.parent

def _write_amostra_csv():
    """Gera docs/amostra.csv a partir do JSON final, com CH_total e sem Modulo/Tipo."""
    json_path = ROOT / "web" / "data" / "materias.json"
    out_path = ROOT / "docs" / "amostra.csv"

    with json_path.open(encoding="utf-8") as f:
        materias = json.load(f)

    headers = ["Codigo", "Nome", "Turma", "Professor", "CH_total",
               "Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Link"]

    with out_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(headers)
        for m in materias:
            h = m.get("horarios", {})
            writer.writerow([
                m.get("codigo", ""),
                m.get("nome", ""),
                m.get("turma", ""),
                m.get("professor", ""),
                m.get("ch", ""),
                h.get("seg", ""),
                h.get("ter", ""),
                h.get("qua", ""),
                h.get("qui", ""),
                h.get("sex", ""),
                h.get("sab", ""),
                m.get("link", ""),
            ])

    print(f"  {len(materias)} linhas escritas em {out_path}")

def main():
    load_dotenv()
    CPF = os.environ.get("UFF_USER")
    SENHA = os.environ.get("UFF_PASSWORD")
    
    if not CPF or not SENHA:
        print("Erro: CPF ou SENHA não encontrados no .env")
        return

    SEARCH_URL = "https://app.uff.br/graduacao/quadrodehorarios/?utf8=%E2%9C%93&q%5Bdisciplina_nome_or_disciplina_codigo_cont%5D=&q%5Banosemestre_eq%5D=20261&q%5Bdisciplina_cod_departamento_eq%5D=&button=&q%5Bidturno_eq%5D=&q%5Bpor_professor%5D=&q%5Bidlocalidade_eq%5D=1&q%5Bvagas_turma_curso_idcurso_eq%5D=4&q%5Bdisciplina_disciplinas_curriculos_idcurriculo_eq%5D=&q%5Bcurso_ferias_eq%5D=&q%5Bidturmamodalidade_eq%5D="
    
    os.makedirs("docs", exist_ok=True)
    csv_filename = "docs/turmas_uff_final.csv"

    print("Iniciando Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print(f"Navegando para a Grade para iniciar o login SSO...")
        page.goto(SEARCH_URL, wait_until="networkidle")
        time.sleep(2)
        
        # Click the native 'Login' button in the navbar
        login_btn = page.locator("a:has-text('Login')").first
        if login_btn.count() > 0:
            print("Clicando no botão de Login nativo...")
            login_btn.click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
        
        # Now at idUFF login page:
        if page.locator("input[type='password']").count() > 0:
            print("Página de login detectada. Inserindo credenciais...")
            page.locator("input[type='text']").first.fill(CPF)
            page.locator("input[type='password']").first.fill(SENHA)
            
            btn = page.locator("input[value='ACESSAR']")
            if btn.count() > 0:
                btn.first.click()
            else:
                page.keyboard.press("Enter")
                
            page.wait_for_load_state("networkidle")
            time.sleep(3)
        
        print(f"Navegando para a Grade novamente com os filtros aplicados...")
        page.goto(SEARCH_URL, wait_until="networkidle")
        time.sleep(2)
            
        print("Buscando turmas...")
        btn = page.locator("text='Buscar Turmas'")
        if btn.count() > 0:
            btn.first.click()
            page.wait_for_selector("table", timeout=15000)
            time.sleep(2)
        else:
            print("Botão 'Buscar Turmas' não encontrado!")
            browser.close()
            return
            
        out_headers = [
            "Código", "Nome", "Turma", "Professor", "Módulo", 
            "Tipo de Oferta", "Seg", "Ter", "Qua", "Qui", 
            "Sex", "Sab", "Cursos", "Link para disciplina"
        ]
        
        with open(csv_filename, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f, delimiter=';')
            writer.writerow(out_headers)
            
            page_num = 1
            while True:
                print(f"Extraindo dados da tabela - Página {page_num}...")
                html = page.content()
                soup = BeautifulSoup(html, "html.parser")
                
                table = soup.find("table")
                if not table:
                    print("Nenhuma tabela encontrada nesta página.")
                    break
                    
                rows = table.find("tbody").find_all("tr", recursive=False)
                print(f"Encontradas {len(rows)} turmas na página {page_num}.")
                
                for row in rows:
                    cells = row.find_all("td", recursive=False)
                    if len(cells) < 11:
                        continue
                        
                    codigo = cells[0].get_text(strip=True)
                    
                    nome_cell = cells[1]
                    nome = ""
                    professor = ""
                    cursos_str = ""
                    link = ""
                    
                    if nome_cell:
                        a_tag = nome_cell.find("a")
                        if a_tag:
                            nome = a_tag.get_text(strip=True)
                            link = "https://app.uff.br" + a_tag.get("href", "")
                        else:
                            nome = nome_cell.get_text(strip=True)
                            
                        tooltip = nome_cell.get("title") or nome_cell.get("data-original-title", "")
                        if tooltip:
                            prof_match = re.search(r"Professor\(es\):\s*(.*?)(?:\n|<br/>|$)", tooltip)
                            if prof_match:
                                professor = prof_match.group(1).strip()
                                
                            cursos_match = re.search(r"Curso\(s\) com vagas:\s*(.*)", tooltip)
                            if cursos_match:
                                cursos_list_str = cursos_match.group(1).strip()
                                if cursos_list_str:
                                    total_cursos = len(cursos_list_str.split(","))
                                    cursos_str = f"{cursos_list_str} ({total_cursos})"
                                    
                    turma = cells[2].get_text(strip=True)
                    modulo = cells[3].get_text(strip=True)
                    tipo_oferta = cells[4].get_text(strip=True)
                    
                    seg = cells[5].get_text(strip=True)
                    ter = cells[6].get_text(strip=True)
                    qua = cells[7].get_text(strip=True)
                    qui = cells[8].get_text(strip=True)
                    sex = cells[9].get_text(strip=True)
                    sab = cells[10].get_text(strip=True)
                    
                    writer.writerow([
                        codigo, nome, turma, professor, modulo,
                        tipo_oferta, seg, ter, qua, qui, sex, sab,
                        cursos_str, link
                    ])
                    
                next_btn = page.locator("li.page-item:not(.disabled) a:has-text('Próxima')")
                if next_btn.count() > 0:
                    print("Indo para a próxima página...")
                    next_btn.first.click()
                    page.wait_for_selector("table", timeout=15000)
                    time.sleep(3)
                    page_num += 1
                else:
                    print("Última página alcançada ou sem paginação.")
                    break
                
        print(f"Dados extraídos com sucesso para {csv_filename}!")
        browser.close()

        print("\nConvertendo CSV para JSON...")
        parse_csv.run(csv_path=csv_filename)

        import scrape_ch
        print("\nBuscando Carga Horaria (CH) das disciplinas...")
        scrape_ch.run()

        print("\nGerando docs/amostra.csv a partir do JSON final...")
        _write_amostra_csv()
        print("Pipeline completo!")

if __name__ == "__main__":
    main()
