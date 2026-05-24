# Novo Lar Financeiro

Sistema financeiro do Grupo Novo Lar (4 ILPIs em Porto Alegre).

**Status:** Phase 1 — Parte 1 (Foundation) ✅

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind 4 + Wouter
- **Backend:** Express 4 + tRPC 11
- **ORM:** Drizzle ORM 0.44 → MySQL 8
- **Validação:** Zod 4
- **Testes:** Vitest 2

## Quick start

```bash
# 1. Instalar
pnpm install

# 2. Configurar ambiente
cp .env.example .env
# editar .env (mínimo: DATABASE_URL apontando para um MySQL 8)

# 3. Subir MySQL (opcional, com Docker)
docker run -d \
  --name novo-lar-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=novo_lar_dev \
  -p 3306:3306 \
  mysql:8

# 4. Gerar e aplicar migrations
pnpm db:push

# 5. Seed (4 unidades, 42 categorias, 9 linhas margem, 5 formas pag)
pnpm db:seed

# 6. Dev (backend :3000 + frontend :5173 via proxy)
pnpm dev
```

## Scripts

| Script | O que faz |
|---|---|
| `pnpm dev` | Backend Express+tRPC em watch mode (`:3000`) |
| `pnpm build` | Build de produção (frontend + backend bundle) |
| `pnpm start` | Roda o build de produção |
| `pnpm check` | Type-check com TypeScript |
| `pnpm test` | Vitest run |
| `pnpm test:watch` | Vitest watch |
| `pnpm db:generate` | Gera SQL migrations a partir do schema |
| `pnpm db:migrate` | Aplica migrations no banco |
| `pnpm db:push` | `generate` + `migrate` em sequência |
| `pnpm db:seed` | Popula dados-mestre |

## Estrutura

```
.
├── client/                # Frontend React (Vite root)
│   └── src/
├── server/                # Backend Express + tRPC
│   ├── _core/             # init, trpc, context, env
│   └── routers/           # routers tRPC (preenchido na Parte 2)
├── drizzle/
│   ├── schema.ts          # 11 tabelas
│   ├── relations.ts       # relations() do Drizzle
│   ├── seed.ts            # dados-mestre idempotentes
│   └── migrations/        # gerado por drizzle-kit
├── shared/                # types compartilhados (AppRouter)
└── .github/workflows/     # CI
```

## Schema (11 tabelas)

| Tabela | Função |
|---|---|
| `users` | Login OAuth + role |
| `unidades` | 4 casas do grupo |
| `categorias` | Plano de contas dinâmico (42 base) |
| `fornecedores` | Cadastro de fornecedores |
| `formas_pagamento` | Banco / Dinheiro / Cartão / PIX |
| `linhas_margem` | 9 linhas para análise de margens |
| `movimentacoes` | Entradas/Saídas de caixa |
| `rateios` | Distribuição por categoria com desconto/frete proporcionais |
| `titulos` | Contas a pagar/receber com saldo em aberto |
| `audit_log` | Trilha de auditoria de todas as mutations |

Detalhes na [Especificação Técnica](./docs/) seção 4.2.

## Roadmap

- **Parte 1 (atual):** Foundation — setup, schema, migrations, seed
- **Parte 2:** Backend — 5 CRUDs mestre, movimentações + rateios, títulos, auditoria, testes
- **Parte 3:** Frontend — 10 páginas, integração, build de produção, smoke test
