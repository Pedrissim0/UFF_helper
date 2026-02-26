# Grade Horária — CLAUDE.md

## Visão Geral
Site utilitário para alunos de Economia montarem sua grade de horários.
MVP: lista de matérias com filtros + visualização semanal de grade.

## Estrutura do Projeto
- /web       → frontend em Next.js (App Router)
- /scraper   → scripts Python para gerar db_disciplinas.json
- /docs      → decisões de arquitetura e exemplos de dados

## Stack
- Frontend: Next.js 14, App Router, CSS Modules (sem Tailwind por ora)
- Scraping: Python 3, requests, BeautifulSoup4
- Sem backend próprio — dados servidos via JSON estático

## Contrato de Dados (db_disciplinas.json)
Todo dado de matéria deve seguir este schema:

{
  "codigo": "ECO00101",
  "nome": "MICROECONOMIA I",
  "turma": "A1",
  "nome_exibicao": "NOME DO PROFESSOR",
  "ch": 60,
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
- /docs/grade_horarios.csv → amostra real dos dados da universidade
- /web/data/db_disciplinas.json → dados no formato do contrato acima

## Status do MVP
- [x] Parser do CSV para JSON
- [x] Lista de matérias com busca
- [x] Filtro por dia/horário
- [x] Visualização da grade semanal
- [x] Detecção de conflitos de horário
- [x] Deploy na Vercel
