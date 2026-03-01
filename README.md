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

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14, App Router, TypeScript, CSS Modules |
| Dados disciplinas | Supabase (PostgreSQL) |
| Leitura de arquivos | papaparse (CSV), SheetJS/xlsx (Excel) |
| Scraping | Python 3, requests, BeautifulSoup4 |
| Parse de PDF | Claude Haiku 4.5 via API (streaming) |
| Deploy | Vercel (branch `main`) |

## Estrutura do Projeto

```
projeto_uff_helper/
├── web/                        # Aplicação Next.js
│   ├── app/
│   │   ├── page.tsx            # Grade Horária (Server Component)
│   │   ├── layout.tsx
│   │   ├── components/
│   │   │   ├── GradeHoraria.tsx
│   │   │   └── GradeHoraria.module.css
│   │   └── calculadora-cr/
│   │       ├── page.tsx
│   │       ├── CalculadoraCR.tsx
│   │       └── CalculadoraCR.module.css
│   ├── data/
│   │   ├── db_disciplinas.json # 130+ disciplinas com horários
│   │   └── matriz_curricular.json
│   └── lib/
│       └── supabase.ts
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
- Node.js 18+
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

O deploy é automático via Vercel a cada push na branch `main`. A branch `feature/calculadora-cr` contém a Calculadora de CR (ainda não mergeada).

## Privacidade

Nenhum dado pessoal do aluno é enviado a servidores. Todo o processamento do histórico acadêmico ocorre no browser do usuário.
