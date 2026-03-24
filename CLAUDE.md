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

## Qualidade de Codigo
- Prettier: `web/.prettierrc` (semi, double quotes, printWidth 90)
- Pre-commit: Husky + lint-staged (Prettier + ESLint em arquivos staged)
- Error boundary: `web/app/error.tsx` (captura erros de runtime)
- Pagina 404: `web/app/not-found.tsx`
- SEO: title template `"%s | UFF Helper"`, Open Graph, metadataBase
- Footer global: `web/app/components/Footer.tsx` (GitHub, LinkedIn, WhatsApp)

## Arquivos Importantes
- /docs/grade_horarios.csv → amostra real dos dados da universidade
- /web/data/db_disciplinas.json → dados no formato do contrato acima
- /web/data/curriculo.json → matriz curricular (8 períodos, disciplinas obrigatórias)
- /web/hooks/useRoadmapConnections.ts → hook de conexões SVG do roadmap
- /web/lib/calcularColunas.ts → alinhamento de cadeias de pré-requisitos
- /web/lib/calcularEstadoDisciplina.ts → estado visual: aprovado/desbloqueado/bloqueado/normal
- /web/lib/formatarNomeDisciplina.ts → Title Case com suporte a numerais romanos
- /web/lib/hashFile.ts → SHA-256 hash para dedup de uploads
- /web/types/discipline-files.ts → tipos do sistema de materiais
- /web/app/roadmap/DisciplineDetailModal.tsx → modal de detalhes + aba materiais
- /web/app/api/discipline-files/route.ts → upload de PDFs

## Mamatômetro — Avaliação de Dificuldade por Professor/Disciplina
Crowdsourcing de dificuldade via tooltip do ProfTag → modal com slider → API route → Supabase.

- Tabela `difficulty_ratings`: `(professor_id uuid, disciplina_codigo text, rating int 0-5, ip text)` com UNIQUE `(professor_id, disciplina_codigo, ip)`
- API: `POST /api/difficulty-rating` — upsert com `onConflict: "professor_id,disciplina_codigo,ip"`
- Server Components (`page.tsx`, `controlador-faltas/page.tsx`) fazem fetch com join `professors(name)` e agregam em `difficultyMap: Record<string, { avg, count }>`
- Chave do map: `"nomeCompletoDocente:codigoDisciplina"`
- ProfTag: barra visual "Mamata ——●—— Não pegue" + CTA "Avalie aqui" / "Voto registrado"
- Modal: slider `<input type="range" min=0 max=5>` com labels "Mamata / Normal / Não pegue"
- Mesmo padrão de dedup por IP do email crowdsourcing

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

## Upload de Materiais por Disciplina
Upload e download de provas, listas, resumos, apostilas e VS em PDF, vinculados a disciplina + professor.

### Tabelas Supabase
- `discipline_files`: metadados (id, disciplina_codigo, file_type, label, file_path, file_size, file_hash, ip, downloads_count, flagged, periodo, professor_nome, created_at) com UNIQUE(disciplina_codigo, file_hash)
- `discipline_file_reports`: denúncias (file_id, ip, reason) com UNIQUE(file_id, ip); 3 reports → auto-flag

### Storage
- Bucket privado `discipline-files` no Supabase Storage
- Download via signed URLs (60s) geradas server-side
- `file_path`, `ip`, `file_hash` nunca expostos ao client

### API Routes
- `POST /api/discipline-files` — upload com rate limit (5/24h por IP), validação MIME (%PDF), dedup por SHA-256
- `GET /api/discipline-files/[id]` — download (incrementa contador, redirect signed URL)
- `POST /api/discipline-files/[id]/report` — denúncia com motivo, auto-flag em 3

### Categorias de arquivo
- `prova` (label obrigatório: "P1 - Nome da Disciplina"), `lista`, `resumo`, `apostila`, `vs`

### Frontend
- `web/app/roadmap/DisciplineDetailModal.tsx` — modal extraído do Roadmap com abas "Informações" + "Materiais"
- Seletor de professor (todos que ofertaram a disciplina, via query em `disciplinas`)
- Campo período (formato "2026.1")
- Filtro por professor na listagem
- Report com dropdown de motivos (fixo acima do modal)
- `web/types/discipline-files.ts` — tipos FileMetadata, FilesMap, ProfessorsPerDiscMap
- `web/lib/hashFile.ts` — SHA-256 client-side via crypto.subtle

## Grade Horária — Ordenação por Dificuldade
- Botão na statusBar cicla: null → "dificuldade-desc" → "dificuldade-asc" → null
- Ordena disciplinas dentro de cada grupo de período pela média do Mamatômetro
- Disciplinas sem avaliação vão pro final da lista

## Status
- [x] Grade Horária (MVP completo)
- [x] Calculadora de CR
- [x] Controlador de Faltas
- [x] Roadmap Curricular (fluxograma horizontal + optativas interativas)
- [x] Mamatômetro (avaliação de dificuldade por professor/disciplina)
- [x] Upload de Materiais (provas, listas, resumos, apostilas, VS por disciplina)
- [x] Ordenação por dificuldade na grade horária
- [x] Deploy na Vercel
- [x] Error boundaries (error.tsx + not-found.tsx)
- [x] Prettier + Husky + lint-staged
- [x] SEO / Open Graph por rota
- [x] Footer global com links de contato
