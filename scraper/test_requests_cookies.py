import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
import requests
from bs4 import BeautifulSoup

def main():
    load_dotenv()
    CPF = os.environ.get("UFF_USER")
    SENHA = os.environ.get("UFF_PASSWORD")
    
    SEARCH_URL = "https://app.uff.br/graduacao/quadrodehorarios/"
    TARGET_URL = "https://app.uff.br/graduacao/quadrodehorarios/turmas/100000449119"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print(f"Navegando para a Grade para iniciar o login SSO...")
        page.goto(SEARCH_URL, wait_until="networkidle")
        time.sleep(2)
        
        login_btn = page.locator("a:has-text('Login')").first
        if login_btn.count() > 0:
            login_btn.click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
        
        if page.locator("input[type='password']").count() > 0:
            page.locator("input[type='text']").first.fill(CPF)
            page.locator("input[type='password']").first.fill(SENHA)
            btn = page.locator("input[value='ACESSAR']")
            if btn.count() > 0:
                btn.first.click()
            else:
                page.keyboard.press("Enter")
            page.wait_for_load_state("networkidle")
            time.sleep(3)
        
        # Get cookies
        playwright_cookies = context.cookies()
        browser.close()

    print("Playwright session closed. Testing Requests with cookies...")
    
    # Format cookies for requests
    session = requests.Session()
    for c in playwright_cookies:
        session.cookies.set(c['name'], c['value'], domain=c['domain'], path=c['path'])
        
    resp = session.get(TARGET_URL)
    soup = BeautifulSoup(resp.text, "html.parser")
    
    # Extrair nome do docente
    tabela = soup.find("table", id="tabela-alteracao-professores-turma")
    docente = None
    if tabela:
        tbody = tabela.find("tbody")
        if tbody:
            tr = tbody.find("tr")
            if tr:
                tds = tr.find_all("td")
                if tds:
                    docente = tds[0].get_text(strip=True)
                    print(f"REQUESTS Docente encontrado: {docente}")
    
    if not docente:
        print("REQUESTS Docente não encontrado.")

if __name__ == "__main__":
    main()
