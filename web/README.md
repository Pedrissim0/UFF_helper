# UFF Helper

Site utilitário para alunos de Economia da UFF. Acesse em: **[uff-helper.vercel.app](https://uff-helper.vercel.app)**

## Funcionalidades

| Rota | Descrição |
|---|---|
| `/` | Grade horária — monte sua grade semanal, detecte conflitos, veja co-requisitos |
| `/calculadora-cr` | Calculadora de CR — importe o histórico (CSV/XLSX) ou preencha manualmente; projeções por período |
| `/controlador-faltas` | Controlador de faltas — acompanhe faltas por disciplina com limite legal (25%) |

## Stack

- **Next.js 14** (App Router, TypeScript, CSS Modules)
- **Zustand** — estado global persistido no localStorage
- **Supabase** — banco de dados de disciplinas e professores (leitura pública)
- **Vercel** — deploy automático a partir da branch `main`

## Estrutura

```
/web        → frontend Next.js
/scraper    → scripts Python: CSV/PDF → JSON → Supabase
/docs       → dados de referência (grade, matriz curricular)
```

## Rodando localmente

```bash
cd web
npm install
npm run dev     # http://localhost:3000
```

Não é necessário configurar variáveis de ambiente para desenvolvimento — as credenciais do Supabase são públicas (somente leitura).

## Stores Zustand

| Store | Chave localStorage | Conteúdo |
|---|---|---|
| `useUIStore` | `tema` | Tema claro/escuro |
| `useGradeStore` | `grade-horaria:grade` | Disciplinas selecionadas na grade |
| `useDisciplinasStore` | `grade-horaria:aprovadas` | Disciplinas aprovadas (sync da calculadora) |
| `useCalculadoraStore` | `grade-horaria:calculadora-cr` | Histórico da calculadora de CR |
| `useFaltasStore` | `grade-horaria:controlador-faltas` | Faltas por disciplina |

## Scraper (Python)

```bash
cd scraper
pip install -r requirements.txt

python parse_csv.py          # CSV da UFF → db_disciplinas.json
python enrich_materias.py    # adiciona dados da matriz curricular
python upload_to_supabase.py # sincroniza com Supabase
```
