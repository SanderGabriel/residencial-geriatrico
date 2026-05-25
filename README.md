# Novo Lar Financeiro

Sistema financeiro do Grupo Novo Lar (4 ILPIs em Porto Alegre).

**Status:** Phase 1 ✅ completa (todas as 10 páginas funcionais, sem placeholders)

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
| `pnpm test` | Roda **todos** os testes (unit + integration + e2e) — precisa MySQL local |
| `pnpm test:unit` | Só unit tests (sem DB) — para iteração rápida |
| `pnpm test:watch` | Vitest watch |
| `pnpm test:coverage` | Roda com relatório de cobertura |
| `pnpm db:generate` | Gera SQL migrations a partir do schema |
| `pnpm db:migrate` | Aplica migrations no banco |
| `pnpm db:push` | `generate` + `migrate` em sequência |
| `pnpm db:seed` | Popula dados-mestre |

## Testes

155 testes em 13 arquivos. Para rodar todos localmente precisa de MySQL 8 (ou MariaDB 10.5+) rodando:

```bash
# Sobe MySQL via Docker
docker run -d --name novo-lar-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=novo_lar_test \
  -p 3306:3306 mysql:8

# Aplica migrations no DB de teste
TEST_DATABASE_URL='mysql://root:root@127.0.0.1:3306/novo_lar_test' \
  DATABASE_URL='mysql://root:root@127.0.0.1:3306/novo_lar_test' \
  pnpm db:migrate

# Roda toda a suite
TEST_DATABASE_URL='mysql://root:root@127.0.0.1:3306/novo_lar_test' pnpm test
```

Sem MySQL local, use `pnpm test:unit` (skipa integration/e2e — 46 unit tests rodam contra zero deps).

A suite cobre:
- **Helpers puros** (`server/helpers/*.test.ts`): cálculo de rateio proporcional com desconto/frete, validações Zod
- **Format/utils frontend** (`client/src/lib/format.test.ts`): formatBRL, formatDate sem timezone shift, parseBRL
- **CRUD mestres** (5 routers): create/list/get/update/delete com soft delete, uniqueness, bloqueios de FK
- **Movimentações + rateios**: transação completa, recálculo proporcional, filtros (período/tipo/categoria/competência), paginação sem duplicatas
- **Títulos**: pagamento total/parcial atualizando saldo e status, herança de linha_margem na movimentação criada
- **Auditoria**: log de todas as mutations com snapshot antes/depois (objeto, não string)
- **Bug hunt**: 14 edge cases que poderiam falhar só em produção
- **E2E HTTP**: sobe Express + tRPC reais, dispara via fetch, valida ciclo de 12 passos
- **Componente React** (`SaidaRateio`): busca instantânea, validação soma, residual, remover

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

- **Parte 1 ✅:** Foundation — setup, schema, migrations, seed
- **Parte 2 ✅:** Backend — 5 CRUDs mestre, movimentações + rateios, títulos, auditoria, testes unitários
- **Parte 3 ✅:** Frontend — layout, routing, tRPC client, 6 páginas funcionais + 3 placeholders

## Páginas

| Rota | Status | Função |
|---|---|---|
| `/` | ✅ Funcional | Dashboard com últimas 5 movs e atalhos |
| `/nova-saida` | ✅ Funcional | Form com SaidaRateio (busca categorias + tabela de rateios) |
| `/nova-entrada` | ✅ Funcional | Mesmo form, tipo=Entrada |
| `/extrato` | ✅ Funcional | Filtros (período, tipo, unidade, competência, beneficiário) + paginação + saldo acumulado da página |
| `/titulos-pagar` | ✅ Funcional | Lista + modal Pagar (total/parcial) que cria movimentação vinculada |
| `/configuracoes` | ✅ Funcional | 5 tabs CRUD: Unidades, Categorias (dinâmicas), Fornecedores, Formas pag, Linhas de margem |
| `/titulos-receber` | ✅ Funcional | Mesma UI de Pagar (componente compartilhado), filtra categorias de Receita |
| `/agenda` | ✅ Funcional | Títulos agrupados em 4 faixas (vencidos / 7 dias / 30 dias / futuros) com totais |
| `/economia` | ✅ Funcional | 3 agregações backend (por natureza / linha / unidade) + tabelas com barras horizontais sem deps de gráfico |
| `/editar-movimentacao/:id` | ✅ Funcional | Pré-preenchido via `movimentacoes.get`, mantém tipo e unidade imutáveis |
