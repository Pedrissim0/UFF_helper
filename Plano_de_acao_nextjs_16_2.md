# Plano de Ação — Migração Next.js 14.2 → 16.2

Criado em 2026-03-27.

## Contexto

O projeto UFF Helper usa Next.js 14.2.35. A versão 16.2.1 traz melhorias de integração com IAs (AGENTS.md, docs embutidos, browser log forwarding, dev server lock file) e Turbopack como bundler padrão.

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Pulo de 2 major versions (14 → 16) | Alto — acumula breaking changes | Codemod automatizado + correção manual |
| React 18 → 19 obrigatório | Médio — mudanças em forwardRef, use(), compilação | Zustand 5 e Sentry já suportam React 19 |
| APIs assíncronas enforçadas | Alto — params, searchParams, cookies(), headers() | Codemod corrige a maioria; revisar manualmente |
| `next lint` removido | Baixo — migrar para ESLint direto | Simples, já temos ESLint configurado |
| Caching mudou | Médio — fetch() não cacheia mais por default | Revisar Server Components com Supabase |
| Turbopack como default | Baixo — sem webpack config custom | Verificar compatibilidade do Sentry |

## Dependências

| Pacote | Atual | Alvo | Compatível? |
|--------|-------|------|-------------|
| next | 14.2.35 | 16.2.x | — (é o upgrade) |
| react / react-dom | ^18 | ^19 | Obrigatório |
| zustand | ^5.0.11 | ^5.0.11 | Sim (peer: react >=18) |
| @sentry/nextjs | ^10.46.0 | ^10.46.0 | Sim (peer: next ^16.0.0-0) |
| @vercel/analytics | ^1.6.1 | ^2.0.1 | Sim (peer: next >= 13) |
| eslint-config-next | 14.2.35 | 16.2.x | Atualizar junto |
| Node.js | — | ≥ 20.9 | Verificar local + Vercel |

---

## Fase 1 — Preparação

- [ ] Verificar versão do Node.js (precisa ≥ 20.9)
- [ ] Criar branch `feature/nextjs-16`
- [ ] Snapshot dos testes atuais (62 passando = baseline)

## Fase 2 — Upgrade automatizado

- [ ] Rodar `npx @next/codemod@canary upgrade latest`
- [ ] Atualizar React 18 → 19 + `@types/react` + `@types/react-dom`
- [ ] Atualizar `eslint-config-next` para a versão correspondente

## Fase 3 — Correções manuais

- [ ] Corrigir `params`/`searchParams` async em todos os `page.tsx` e `route.ts`
  - `app/page.tsx` (grade)
  - `app/calculadora-cr/page.tsx`
  - `app/controlador-faltas/page.tsx`
  - `app/roadmap/page.tsx`
  - Todas as API routes (`app/api/*/route.ts`)
- [ ] Migrar script `"lint"` de `"next lint"` para `"eslint ."`
- [ ] Verificar `withSentryConfig` com Turbopack
- [ ] Revisar `fetch()` calls nos Server Components (caching mudou)
- [ ] Remover `next-pwa` se não estiver instalado (ou testar compatibilidade)

## Fase 4 — Validação

- [ ] `npx tsc --noEmit` (typecheck limpo)
- [ ] `npm test` (62 testes passando)
- [ ] `npm run build` (build completo sem erros)
- [ ] Testar manualmente cada rota (grade, calculadora, faltas, roadmap, doação)
- [ ] Verificar Vercel preview deploy na branch

## Fase 5 — Finalização

- [ ] Atualizar `CLAUDE.md` com nova versão do Next.js
- [ ] Criar `AGENTS.md` (novo padrão do Next.js 16.2)
- [ ] Atualizar `PLANO_DE_ACAO.md` se necessário
- [ ] Merge na main
