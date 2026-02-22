# Grade Horária — CLAUDE.md

## Visão Geral
Site utilitário para alunos de Economia montarem sua grade de horários.
MVP: lista de matérias com filtros + visualização semanal de grade.

## Estrutura do Projeto
- /web       → frontend em Next.js (App Router)
- /scraper   → scripts Python para gerar materias.json
- /docs      → decisões de arquitetura e exemplos de dados

## Stack
- Frontend: Next.js 14, App Router, CSS Modules (sem Tailwind por ora)
- Scraping: Python 3, requests, BeautifulSoup4
- Sem backend próprio — dados servidos via JSON estático

## Contrato de Dados (materias.json)
Todo dado de matéria deve seguir este schema:

{
  "codigo": "ECO00101",
  "nome": "MICROECONOMIA I",
  "turma": "A1",
  "professor": "NOME DO PROFESSOR",
  "modulo": 60,
  "tipo": "Presencial",
  "link": "https://app.uff.br/graduacao/quadrodehorarios/...",
  "horarios": {
    "seg": "14:00-18:00",
    "ter": "",
    "qua": "",
    "qui": "",
    "sex": "",
    "sab": ""
  }
}

## Regras para os Agentes
- O código em /scraper nunca importa nada de /web e vice-versa
- Qualquer mudança no schema acima deve ser documentada aqui antes de implementada
- O frontend deve funcionar com dados mock enquanto o scraper não estiver pronto
- Nenhum dado pessoal de aluno é enviado para servidor — tudo processado no client

## Arquivos Importantes
- /docs/amostra.csv     → amostra real dos dados da universidade
- /web/data/mock.json   → dados mock no formato do contrato acima

## Status do MVP
- [ ] Parser do CSV para JSON
- [ ] Lista de matérias com busca
- [ ] Filtro por dia/horário
- [ ] Visualização da grade semanal
- [ ] Detecção de conflitos de horário
- [ ] Deploy na Vercel