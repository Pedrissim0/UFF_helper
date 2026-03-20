# Plano de Acao — UFF Helper

Auditoria realizada em 2026-03-18.
Este documento descreve todas as melhorias planejadas, organizadas por prioridade e com estimativa de complexidade.

---

## Diagnostico atual

| Categoria          | Nota | Problema principal                                      |
|--------------------|------|---------------------------------------------------------|
| Qualidade de codigo| C+   | CalculadoraCR (1500 LOC), GradeHoraria (1026 LOC)       |
| Testes             | F    | Zero testes em todo o projeto                           |
| SEO / Metadata     | B+   | Title template, Open Graph e metadata por rota          |
| Acessibilidade     | B-   | ARIA parcial, sem auditoria WCAG                        |
| Performance        | B    | Hooks de memoizacao usados, sem React.memo              |
| Error handling     | B    | Error boundary global (error.tsx) + 404 (not-found.tsx) |
| CI/CD              | D    | Apenas auto-deploy Vercel, sem checks pre-merge         |
| Linting/Formatting | A-   | ESLint + Prettier + Husky pre-commit + lint-staged      |
| PWA                | F    | Nao implementado                                        |
| Documentacao       | A    | README e CLAUDE.md completos                            |

---

## 1. Decomposicao de componentes grandes

**Prioridade:** CRITICA
**Complexidade:** Alta
**Arquivos afetados:** `web/app/calculadora-cr/CalculadoraCR.tsx`, `web/app/components/GradeHoraria.tsx`

### 1.1 CalculadoraCR.tsx (1500 LOC → ~8 arquivos)

Extrair para `web/app/calculadora-cr/components/`:

| Novo arquivo                  | Responsabilidade                                | LOC estimado |
|-------------------------------|-------------------------------------------------|--------------|
| `UploadArea.tsx`              | Drag-and-drop, input file, estado de upload     | ~120         |
| `TabelaDisciplinas.tsx`       | Grid de disciplinas com semestres agrupados     | ~200         |
| `ModalDisciplina.tsx`         | Modal de adicionar/editar disciplina manual     | ~180         |
| `ModalProjecao.tsx`           | Modal de projecao em lote (autocomplete+chips)  | ~150         |
| `FormPeriodo.tsx`             | Pre-preencher por periodo (select+semestre)     | ~100         |
| `WidgetEstatisticas.tsx`      | Widget colapsivel com CR, horas, progresso      | ~200         |
| `GraficoHistorico.tsx`        | Tabela de historico de CR por semestre           | ~100         |
| `CalculadoraCR.tsx`           | Componente pai: orquestra estado e layout       | ~300         |

**Regras da extracao:**
- Cada subcomponente recebe props tipadas (interface propria)
- Estado global (Zustand) continua acessado via hooks nos subcomponentes
- Estado local do formulario pode ficar no componente pai e ser passado via props
- CSS Module compartilhado (ou split em modules por componente)

### 1.2 GradeHoraria.tsx (1026 LOC → ~6 arquivos)

Extrair para `web/app/components/grade/`:

| Novo arquivo                  | Responsabilidade                                | LOC estimado |
|-------------------------------|-------------------------------------------------|--------------|
| `FiltrosDisciplinas.tsx`      | Busca, filtros de dia/horario/periodo           | ~150         |
| `ListaDisciplinas.tsx`        | Lista scrollavel + secao "Selecionadas"         | ~200         |
| `CardDisciplina.tsx`          | Card individual com checkbox, horarios, prof    | ~120         |
| `GradeSemanal.tsx`            | Visualizacao da grade semanal (tabela)          | ~180         |
| `Legenda.tsx`                 | Legenda de cores/conflitos                      | ~50          |
| `GradeHoraria.tsx`            | Componente pai: layout + orquestracao           | ~250         |

---

## 2. Suite de testes

**Prioridade:** CRITICA
**Complexidade:** Media
**Meta:** >70% de cobertura nas funcoes puras, >50% nos componentes

### 2.1 Setup

```
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom ts-jest
```

Adicionar ao `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

Criar `web/jest.config.ts` com suporte a path aliases (`@/`), CSS Modules mock, e Next.js transforms.

### 2.2 Testes unitarios (funcoes puras)

| Arquivo                              | Testes                                                    |
|--------------------------------------|-----------------------------------------------------------|
| `lib/calcularColunas.ts`             | Alinhamento de cadeias, conflito de colunas, sem prereqs  |
| `lib/calcularEstadoDisciplina.ts`    | Aprovado, desbloqueado, bloqueado, normal                 |
| `lib/formatarNomeDisciplina.ts`      | Title case, numerais romanos, preposicoes                 |
| `lib/calcularLimiteFaltas.ts`        | Limites por CH e horarios, edge cases                     |
| `stores/useDisciplinasStore.ts`      | isAprovadoOuEquivalente: aprovado, aproveitamento, dispensa |

### 2.3 Testes de integracao (componentes)

| Componente          | Cenarios                                                       |
|---------------------|----------------------------------------------------------------|
| `UploadArea`        | Upload CSV valido, XLSX valido, formato invalido, arquivo vazio|
| `CalculadoraCR`     | Calculo de CR com reprovacoes, VS, pandemia, projecoes         |
| `GradeHoraria`      | Selecao de disciplina, deteccao de conflito, co-requisitos     |
| `ControladorFaltas` | Adicionar disciplina, incrementar faltas, alerta de limite     |
| `Roadmap`           | Hover destaca cadeia, click abre modal, estados de disciplina  |

### 2.4 Testes E2E (futuro)

Considerar Playwright para fluxos criticos:
- Upload de historico → visualizacao de CR
- Montar grade → detectar conflito → exportar PDF

---

## 3. Error boundaries e paginas de erro ✅ CONCLUIDO

**Prioridade:** ALTA
**Complexidade:** Baixa

### 3.1 `web/app/error.tsx` ✅
- Client Component com `console.error` + botao "Tentar novamente" + link "Voltar ao inicio"
- Inline styles usando CSS variables do projeto (funciona em light/dark)

### 3.2 `web/app/not-found.tsx` ✅
- Pagina 404 com codigo "404" grande, mensagem clara e botao de volta
- Mesmo padrao visual do error.tsx

### 3.3 Error boundaries por feature (opcional)

Criar `error.tsx` em cada rota (`/calculadora-cr/error.tsx`, `/roadmap/error.tsx`) para mensagens especificas por feature.

---

## 4. CI com GitHub Actions

**Prioridade:** ALTA
**Complexidade:** Baixa

### 4.1 Criar `.github/workflows/ci.yml`

```yaml
Triggers: push e pull_request em main e feature/*

Jobs:
  1. lint:
     - npm ci
     - npx next lint

  2. typecheck:
     - npm ci
     - npx tsc --noEmit

  3. test:
     - npm ci
     - npm test -- --coverage
     - Upload coverage report como artifact

  4. build:
     - npm ci
     - npm run build
     - Verificar que o build nao quebra
```

### 4.2 Branch protection rules

Configurar no GitHub:
- Require status checks to pass (lint, typecheck, test, build)
- Require pull request reviews before merge
- Impedir push direto na main

---

## 5. SEO e Open Graph ✅ CONCLUIDO (parcial)

**Prioridade:** MEDIA
**Complexidade:** Baixa

### 5.1 Metadata global (`web/app/layout.tsx`) ✅
- title template: `"%s | UFF Helper"`
- metadataBase: `https://uff-helper.vercel.app`
- openGraph: title, description, url, siteName, locale "pt_BR", type "website"
- twitter: card "summary_large_image"

### 5.2 Metadata por rota ✅

| Rota                  | Title (renderizado)                    | Status |
|-----------------------|----------------------------------------|--------|
| `/`                   | Grade Horaria \| UFF Helper            | ✅     |
| `/calculadora-cr`     | Calculadora de CR \| UFF Helper        | ✅     |
| `/controlador-faltas` | Controlador de Faltas \| UFF Helper    | ✅     |
| `/roadmap`            | Roadmap Curricular \| UFF Helper       | ✅     |

### 5.3 Assets (pendente)

Criar em `web/public/`:
- `favicon.ico` (32x32)
- `apple-touch-icon.png` (180x180)
- `og-image.png` (1200x630) — imagem para compartilhamento social

---

## 6. Validacao de input com Zod

**Prioridade:** MEDIA
**Complexidade:** Media

### 6.1 Setup

```
npm install zod
```

### 6.2 Schemas

| Schema                  | Onde usar                              | Campos validados                                  |
|-------------------------|----------------------------------------|---------------------------------------------------|
| `DisciplinaUploadSchema`| `processFile` em CalculadoraCR         | codigo (string), nome (string), nota (number 0-10 ou null), semestre (regex) |
| `FormDisciplinaSchema`  | Modal de adicionar disciplina          | codigo obrigatorio, nota 0-10, semestre formato YYYY.N |
| `FormProjecaoSchema`    | Modal de projecao em lote              | nota 0-10, semestre valido                        |

### 6.3 Integracao

- Validar cada linha do CSV/XLSX antes de criar o objeto `Disciplina`
- Linhas invalidas: ignorar com warning (nao quebrar o upload inteiro)
- Exibir contador: "58 disciplinas carregadas, 3 linhas ignoradas"
- Validar formularios do modal antes de adicionar

---

## 7. Prettier + pre-commit hooks ✅ CONCLUIDO

**Prioridade:** MEDIA
**Complexidade:** Baixa

### 7.1 Prettier ✅
- `web/.prettierrc`: semi, double quotes, tabWidth 2, trailingComma es5, printWidth 90
- Scripts: `npm run format` e `npm run format:check`

### 7.2 Husky + lint-staged ✅
- `web/.husky/pre-commit`: roda `npx lint-staged` antes de cada commit
- lint-staged: `*.{ts,tsx}` → Prettier + ESLint fix; `*.css` → Prettier
- `prepare` script: `cd .. && husky web/.husky` (git na raiz, npm no /web)

---

## 8. Logging de erros em producao

**Prioridade:** MEDIA
**Complexidade:** Baixa

### 8.1 Sentry

```
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configurar:
- `sentry.client.config.ts` — captura erros no browser
- `sentry.server.config.ts` — captura erros no servidor
- `sentry.edge.config.ts` — captura erros em edge functions
- DSN via variavel de ambiente `SENTRY_DSN`
- Sample rate: 1.0 em dev, 0.3 em producao
- Filtrar erros de rede (fetch failures) para reduzir ruido

### 8.2 Integracao com error boundaries

O `error.tsx` criado no item 3 deve chamar `Sentry.captureException(error)` antes de renderizar a UI de erro.

---

## 9. PWA (Progressive Web App)

**Prioridade:** BAIXA
**Complexidade:** Media

### 9.1 Manifest

Criar `web/public/manifest.json`:
```json
{
  "name": "UFF Helper",
  "short_name": "UFF Helper",
  "description": "Grade horaria, CR e roadmap para Economia UFF",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Referenciar no `layout.tsx`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#6366f1" />
```

### 9.2 Service Worker (next-pwa)

```
npm install next-pwa
```

Configurar em `next.config.js`:
```js
const withPWA = require("next-pwa")({ dest: "public", disable: process.env.NODE_ENV === "development" });
module.exports = withPWA({ /* existing config */ });
```

Estrategia de cache:
- **Stale-while-revalidate** para paginas HTML
- **Cache-first** para CSS, JS, fontes
- **Network-first** para dados do Supabase (disciplinas)
- Dados do Zustand (localStorage) ja funcionam offline

---

## 10. Acessibilidade WCAG 2.1 AA

**Prioridade:** BAIXA
**Complexidade:** Media

### 10.1 Auditoria de contraste

Verificar todas as combinacoes texto/fundo em ambos os temas:

| Variavel            | Light        | Dark         | Verificar contra |
|---------------------|--------------|--------------|-------------------|
| `--text-primary`    | `#1a1a1a`    | `#e8e8f0`    | `--bg-card`       |
| `--text-muted`      | `#666`       | `#9a9ab0`    | `--bg-card`       |
| `--text-subtle`     | `#888`       | `#7a7a90`    | `--bg-card`       |
| `--text-placeholder`| `#aaa`       | `#5a5a70`    | `--bg-input`      |

Ferramenta: https://webaim.org/resources/contrastchecker/
Meta: ratio minimo 4.5:1 para texto normal, 3:1 para texto grande.

### 10.2 Navegacao por teclado

- Adicionar `:focus-visible` styles em todos os elementos interativos
- Garantir tab order logico em cada pagina
- Testar com Tab, Shift+Tab, Enter, Escape em todos os modais
- Adicionar `<a href="#main" class="skip-link">Pular para o conteudo</a>` no layout

### 10.3 Screen reader

- Verificar que todos os icones SVG tem `aria-hidden="true"`
- Garantir que botoes de acao tem `aria-label` descritivo
- Testar com NVDA ou VoiceOver nos fluxos principais
- Adicionar `aria-live="polite"` em regioes que atualizam dinamicamente (contadores, toasts)

---

## Ordem de implementacao sugerida

```
Fase 1 — Fundacao ✅ CONCLUIDA
  [3] ✅ Error boundaries (error.tsx, not-found.tsx)
  [7] ✅ Prettier + husky + lint-staged
  [5] ✅ SEO e metadata por rota (faltam assets: favicon, og-image)
  [+] ✅ Footer global com links de contato (GitHub, LinkedIn, WhatsApp)

Fase 2 — Qualidade (2-3 semanas)
  [2] Setup de testes + testes unitarios das funcoes puras
  [4] GitHub Actions CI
  [6] Validacao com Zod no upload

Fase 3 — Refatoracao (3-4 semanas)
  [1.1] Decompor CalculadoraCR.tsx
  [1.2] Decompor GradeHoraria.tsx
  [2.3] Testes de integracao dos componentes extraidos

Fase 4 — Producao (1-2 semanas)
  [8] Sentry para logging de erros
  [10] Auditoria de acessibilidade + correcoes

Fase 5 — Extra (opcional)
  [9] PWA (manifest + service worker)
  [2.4] Testes E2E com Playwright
```

---

## Restricoes

- Nao instalar Tailwind (projeto usa CSS Modules por decisao de design)
- Nao alterar o schema de `db_disciplinas.json` ou `curriculo.json` sem atualizar CLAUDE.md
- Nao enviar dados pessoais para servidor (tudo client-side)
- Manter compatibilidade com Vercel deploy (branch main)
- Scraper (/scraper) e frontend (/web) nao devem importar entre si
