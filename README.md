# UFF Helper

Utilitário web para alunos do curso de **Economia da UFF** montarem sua grade de horários e calcularem o Coeficiente de Rendimento (CR).

## Funcionalidades

### Grade Horária
- Lista todas as disciplinas do quadro de horários com turma e professor
- Filtros por dia, horário e período
- Visualização semanal interativa com detecção de conflitos
- Auto-seleção de co-requisitos (laboratórios vinculados à teoria)
- Seção "Selecionadas" fixada no topo da lista
- Exportação para PDF em A4 paisagem

### Calculadora de CR
- Carrega histórico acadêmico via arquivo `.csv` ou `.xlsx`
- Adiciona disciplinas manualmente com autocomplete
- Pré-preenche grade por período a partir da matriz curricular
- Projeção de CR: adiciona disciplinas futuras em lote com nota padrão 10
- Histórico de CR acumulado por semestre com gráfico de linha
- Widget colapsível com estatísticas: CR atual, horas cursadas, % do curso concluído
- Regras do CR da UFF: exclusão de trancamentos, reprovados durante a pandemia (2020–2022), VS, Curso de Férias

### Controlador de Faltas
- Adiciona disciplinas da grade horária com cálculo automático de limite de faltas
- Cards com contagem visual: normal → amarelo (≥50%) → laranja (≥75%) → vermelho (≥100%)
- Persistência local via Zustand

### Mamatômetro (Avaliação de Dificuldade)
- Avalie a dificuldade de cada disciplina por professor (escala 0–5: Mamata → Não pegue)
- Barra visual de dificuldade média no tooltip do professor
- 1 voto por IP por combinação professor+disciplina (upsert permite alterar voto)
- Crowdsourcing: resultados agregados visíveis para todos os alunos
- Ordenação por dificuldade na grade horária (mais difíceis / mais fáceis primeiro)

### Upload de Materiais
- Upload de provas, listas, resumos, apostilas e VS em PDF por disciplina e professor
- Modal com abas "Informações" + "Materiais" no roadmap curricular
- Seletor de professor (todos que já ofertaram a disciplina)
- Campo de período (formato "2026.1") exibido no nome do arquivo
- Prova exige label no formato "P1 - Nome da Disciplina"
- Deduplicação via SHA-256 hash no client
- Rate limit: 5 uploads/dia por IP
- Sistema de denúncia com 7 motivos; 3 reports auto-flaggam o arquivo
- Download via signed URLs (bucket privado no Supabase Storage)
- Filtro por professor na listagem de materiais

### Roadmap Curricular
- Fluxograma horizontal da matriz curricular (8 períodos como colunas)
- Cards de disciplina com borda colorida por estado (aprovado/desbloqueado/bloqueado)
- Setas SVG animadas e tracejadas conectando cadeias de pré-requisitos
- Hover destaca a cadeia completa (pré-requisitos + dependentes), escurece o restante
- Cabeçalho de período transparente com borda roxa translúcida
- **Seleção de optativas**: card "Optativas" clicável abre modal com busca e lista de disciplinas disponíveis
- **Cards roxos interativos**: optativas selecionadas ocupam slots vazios do grid, com drag & drop entre períodos
- **Importação automática**: optativas aprovadas na Calculadora de CR aparecem como cards com borda verde e tag "Aprovado"
- Distribuição inteligente de optativas por carga horária — card inferior desaparece quando o período está completo
- Hover em optativas destaca cadeia de pré-requisitos; click abre modal de detalhes
- Legenda de cores no rodapé (aprovado, desbloqueado, normal, bloqueado, optativa)
- Barra de progresso de disciplinas cursadas
- Layout responsivo: grid horizontal com scroll em desktop, vertical em mobile
- Integra com `useDisciplinasStore` e `useCalculadoraStore` para refletir aprovações do aluno

### Sistema de Doação
- Doações via Pix integradas com AbacatePay
- Barra sticky no topo: "X meses e Y dias de funcionamento garantido"
- Modal com valores rápidos (R$5, R$10, R$25) ou valor personalizado
- Atualização automática ao voltar do checkout (sync com API da AbacatePay)
- Custo mensal estimado: R$500/mês

### Footer
- Links de contato do desenvolvedor: [GitHub](https://github.com/Pedrissim0), [LinkedIn](https://www.linkedin.com/in/pedro-vitor-costa-770063188/), [WhatsApp](https://wa.me/5521986793427)
- Presente em todas as páginas via `layout.tsx`

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14, App Router, TypeScript, CSS Modules |
| Estado global | Zustand (persist middleware) |
| Dados disciplinas | Supabase (PostgreSQL) |
| Validação | Zod (upload CSV/XLSX + formulários) |
| Pagamentos | AbacatePay (Pix) |
| Leitura de arquivos | papaparse (CSV), SheetJS/xlsx (Excel) |
| Scraping | Python 3, requests, BeautifulSoup4 |
| Parse de PDF | Claude Haiku 4.5 via API (streaming) |
| Testes | Jest + Testing Library (62 testes, 9 suites) |
| CI | GitHub Actions (lint, typecheck, test, build) |
| Monitoramento | Sentry (client/server/edge) |
| Formatação | Prettier + Husky pre-commit + lint-staged |
| Deploy | Vercel (branch `main`) |

## Estrutura do Projeto

```
projeto_uff_helper/
├── web/                        # Aplicação Next.js
│   ├── app/
│   │   ├── page.tsx            # Redirect → /grade
│   │   ├── layout.tsx          # Server Component (skip link, DonateBar, Footer)
│   │   ├── globals.css         # Variáveis CSS (light/dark) + acessibilidade
│   │   ├── error.tsx           # Error boundary (Sentry + UI)
│   │   ├── global-error.tsx    # Error boundary root layout (Sentry)
│   │   ├── not-found.tsx       # Página 404 customizada
│   │   ├── components/
│   │   │   ├── Footer.tsx
│   │   │   ├── DonateBar.tsx         # Barra de doação + modal
│   │   │   ├── GradeHoraria.tsx      # Orquestrador
│   │   │   └── grade/                # Subcomponentes extraídos
│   │   │       ├── CardDisciplina.tsx
│   │   │       ├── FiltrosDisciplinas.tsx
│   │   │       ├── GradeSemanal.tsx
│   │   │       ├── Legenda.tsx
│   │   │       └── types.ts
│   │   ├── calculadora-cr/
│   │   │   ├── page.tsx
│   │   │   ├── CalculadoraCR.tsx     # Orquestrador
│   │   │   ├── types.ts             # Tipos + helpers compartilhados
│   │   │   └── components/           # Subcomponentes extraídos
│   │   │       ├── UploadArea.tsx
│   │   │       ├── TabelaDisciplinas.tsx
│   │   │       ├── ModalDisciplina.tsx
│   │   │       ├── ModalProjecao.tsx
│   │   │       ├── FormPeriodo.tsx
│   │   │       ├── WidgetEstatisticas.tsx
│   │   │       ├── GraficoHistorico.tsx
│   │   │       └── Icons.tsx
│   │   ├── controlador-faltas/
│   │   │   ├── page.tsx
│   │   │   └── ControladorFaltas.tsx
│   │   ├── roadmap/
│   │   │   ├── page.tsx
│   │   │   ├── Roadmap.tsx
│   │   │   └── DisciplineDetailModal.tsx
│   │   └── api/
│   │       ├── donate/              # Doação (create, webhook, sync, total)
│   │       ├── discipline-files/    # Upload, download e report de materiais
│   │       ├── difficulty-rating/   # Mamatômetro
│   │       ├── email-submission/    # Crowdsourcing email
│   │       └── name-contest/       # Concurso de nomes
│   ├── data/
│   │   ├── db_disciplinas.json     # 130+ disciplinas com horários
│   │   ├── matriz_curricular.json
│   │   └── curriculo.json          # Matriz curricular (8 períodos)
│   ├── hooks/
│   │   └── useRoadmapConnections.ts # SVG prereq arrows
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── schemas.ts              # Zod schemas (upload, formulários)
│   │   ├── calcularColunas.ts
│   │   ├── calcularEstadoDisciplina.ts
│   │   ├── formatarNomeDisciplina.ts
│   │   └── hashFile.ts
│   ├── types/
│   │   └── discipline-files.ts     # Tipos do sistema de materiais
│   └── stores/                     # Zustand (persist middleware)
│       ├── useUIStore.ts
│       ├── useGradeStore.ts
│       ├── useDisciplinasStore.ts
│       ├── useCalculadoraStore.ts
│       └── useFaltasStore.ts
│
├── scraper/                    # Scripts Python
│   ├── parse_csv.py            # CSV do quadro → db_disciplinas.json
│   ├── parse_matriz.py         # PDF da matriz → matriz_curricular.json
│   ├── enrich_materias.py      # Enriquece disciplinas com dados da matriz
│   ├── scrape_ch.py            # Scrape de carga horária
│   └── upload_to_supabase.py   # Sincroniza JSON com Supabase
│
└── docs/
    ├── grade_horarios.csv      # Amostra real do quadro de horários
    ├── cr_teste.xlsx           # Arquivo de teste para validar CR (resultado: 7.0)
    └── matriz_curricular/
        ├── MatrizCurricular2026_1771898812687.pdf
        ├── matriz_curricular.json
        └── equivalencias.json  # Mapa de códigos quadro→matriz
```

## Instalação e Desenvolvimento

### Pré-requisitos
- Node.js 20+
- Python 3.10+

### Frontend

```bash
cd web
npm install
cp .env.local.example .env.local   # adicionar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Acesse `http://localhost:3000`.

### Variáveis de ambiente (`web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<chave>
ABACATEPAY_API_KEY=<chave>
ABACATEPAY_WEBHOOK_SECRET=<secret>
NEXT_PUBLIC_SENTRY_DSN=<dsn>               # opcional
NEXT_PUBLIC_MONTHLY_COST_CENTS=50000       # R$500/mês (default)
```

### Pipeline de dados (scraper)

```bash
cd scraper
pip install -r ../requirements.txt

# 1. Gerar db_disciplinas.json a partir do CSV do quadro
python parse_csv.py

# 2. Parsear PDF da matriz curricular
python parse_matriz.py

# 3. Enriquecer disciplinas com período, tipo e pré/co-requisitos
python enrich_materias.py

# 4. Sincronizar com Supabase
python upload_to_supabase.py
```

## Schema de dados

### `db_disciplinas.json`

```json
{
  "codigo": "ECO00101",
  "nome": "MICROECONOMIA I",
  "turma": "A1",
  "nome_exibicao": "NOME DO PROFESSOR",
  "ch": 60,
  "link": "https://app.uff.br/graduacao/quadrodehorarios/...",
  "horarios": {
    "seg": "14:00-18:00",
    "ter": "", "qua": "", "qui": "", "sex": "", "sab": ""
  },
  "periodo": 1,
  "tipo": "obrigatoria",
  "prerequisitos": ["ECO00090"],
  "corequisitos": []
}
```

### Formato esperado do histórico (CSV/XLSX)

| Coluna | Descrição |
|--------|-----------|
| Código | Código da disciplina (ex: `ECO00101`) |
| Nome | Nome da disciplina |
| Situação | `Aprovado`, `Reprovado`, `Trancamento`, etc. |
| Turma | Turma cursada |
| Nota | Nota final (0–10) |
| VS | Nota da Verificação Suplementar, se houver |
| Frequência | Percentual de frequência |
| Horas | Carga horária da disciplina |
| Créditos | Número de créditos |
| Semestre | Semestre cursado (`2022.1` ou `1º/2022`) |

## Regras do CR (UFF)

O cálculo segue as normas da UFF:

- **Exclusões**: trancamentos, atividades complementares, dispensas e monitorias não entram no cálculo
- **Pandemia (2020–2022)**: reprovações nesses semestres são excluídas do CR (aparecem na tabela com opacidade reduzida)
- **VS aprovado** (nota VS ≥ 6): `nota_efetiva = nota_vs`
- **VS reprovado**: `nota_efetiva = (nota + nota_vs) / 2`
- **CR acumulado**: média ponderada por carga horária de todas as tentativas, incluindo reprovações

## Deploy

O deploy é automático via Vercel a cada push na branch `main`.

## Privacidade

Nenhum dado pessoal do aluno é enviado a servidores. Todo o processamento do histórico acadêmico ocorre no browser do usuário.

## Contato

- GitHub: [Pedrissim0](https://github.com/Pedrissim0)
- LinkedIn: [Pedro Vitor Costa](https://www.linkedin.com/in/pedro-vitor-costa-770063188/)
- WhatsApp: [+55 21 98679-3427](https://wa.me/5521986793427)
