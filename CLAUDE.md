# UFF Helper — CLAUDE.md

## Visão Geral
Site utilitário para alunos de Economia da UFF: grade horária, calculadora de CR, controlador de faltas e roadmap curricular.

## Estrutura do Projeto
- /web       → frontend em Next.js (App Router)
- /scraper   → scripts Python para gerar db_disciplinas.json
- /docs      → decisões de arquitetura e exemplos de dados

## Stack
- Frontend: Next.js 14, App Router, TypeScript, CSS Modules
- Estado global: Zustand (persist middleware)
- Dados de disciplinas: Supabase (PostgreSQL)
- Dados curriculares: JSON estático (curriculo.json)
- Scraping: Python 3, requests, BeautifulSoup4
- Deploy: Vercel (branch main)

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
  },
  "periodo": 1,
  "tipo": "obrigatoria",
  "prerequisitos": [],
  "corequisitos": []
}

## Contrato de Dados (curriculo.json)
Dados da matriz curricular usados pelo Roadmap:

{
  "periodos": [
    {
      "numero": 1,
      "label": "1° Período",
      "disciplinas": [
        {
          "codigo": "GAN00145",
          "nome": "MATEMÁTICA PARA ECONOMIA I",
          "carga_horaria": 60,
          "obrigatoria": true,
          "pre_requisitos": []
        }
      ]
    }
  ]
}

## Regras para os Agentes
- O código em /scraper nunca importa nada de /web e vice-versa
- Qualquer mudança nos schemas acima deve ser documentada aqui antes de implementada
- O frontend deve funcionar com dados mock enquanto o scraper não estiver pronto
- Nenhum dado pessoal de aluno é enviado para servidor — tudo processado no client

## Arquivos Importantes
- /docs/grade_horarios.csv → amostra real dos dados da universidade
- /web/data/db_disciplinas.json → dados no formato do contrato acima
- /web/data/curriculo.json → matriz curricular (8 períodos, disciplinas obrigatórias)
- /web/hooks/useRoadmapConnections.ts → hook de conexões SVG do roadmap
- /web/lib/calcularColunas.ts → alinhamento de cadeias de pré-requisitos
- /web/lib/calcularEstadoDisciplina.ts → estado visual: aprovado/desbloqueado/bloqueado/normal
- /web/lib/formatarNomeDisciplina.ts → Title Case com suporte a numerais romanos

## Roadmap Curricular — Optativas
O roadmap suporta seleção de optativas dentro de cada período:
- Card "Optativas" clicável abre modal com busca e seleção
- Optativas selecionadas ocupam slots vazios do grid como cards roxos
- Drag & drop entre períodos (HTML5 Drag API)
- Hover destaca cadeia de pré-requisitos (integrado com dependentsMap)
- Click abre modal de detalhes (mesmo das obrigatórias)
- Optativas aprovadas na Calculadora de CR são importadas automaticamente (borda verde + tag "Aprovado")
- Distribuição por CH: preenche cada período até atingir sua carga de optativas
- Card inferior desaparece quando o período está completo
- Legenda de cores no rodapé da página

## Status
- [x] Grade Horária (MVP completo)
- [x] Calculadora de CR
- [x] Controlador de Faltas
- [x] Roadmap Curricular (fluxograma horizontal + optativas interativas)
- [x] Deploy na Vercel
