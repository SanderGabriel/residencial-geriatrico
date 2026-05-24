/**
 * Helpers para testes de integração contra MySQL real.
 *
 * Cada teste recebe um caller tRPC já autenticado (admin), e o banco é limpo
 * antes de cada teste. As migrations devem estar aplicadas no DB de teste
 * antes de rodar (`DATABASE_URL=...test pnpm db:push`).
 */
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import * as relations from '../../drizzle/relations';
import { appRouter } from '../routers';
import type { AppContext, SessionUser } from '../_core/context';

const fullSchema = { ...schema, ...relations };

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://root:root@127.0.0.1:3306/novo_lar_test';

let pool: mysql.Pool | null = null;
let testDb: MySql2Database<typeof fullSchema> | null = null;

export async function setupTestDb() {
  if (!testDb) {
    pool = mysql.createPool(TEST_DB_URL);
    testDb = drizzle(pool, { schema: fullSchema, mode: 'default' });
  }
  // Sobrescreve a URL para que getDb() use o test DB.
  process.env.DATABASE_URL = TEST_DB_URL;
  // Limpa o singleton do server/db para forçar nova conexão.
  const { closeDb } = await import('../db');
  await closeDb();
  return testDb;
}

export async function teardownTestDb() {
  if (pool) {
    await pool.end();
    pool = null;
    testDb = null;
  }
}

/**
 * Limpa todas as tabelas (ordem reversa de FKs).
 * Não usa TRUNCATE para não resetar AUTO_INCREMENT (irrelevante p/ testes).
 */
export async function resetTables(db: MySql2Database<typeof fullSchema>) {
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await db.execute(sql`DELETE FROM audit_log`);
  await db.execute(sql`DELETE FROM rateios`);
  await db.execute(sql`DELETE FROM movimentacoes`);
  await db.execute(sql`DELETE FROM titulos`);
  await db.execute(sql`DELETE FROM categorias`);
  await db.execute(sql`DELETE FROM fornecedores`);
  await db.execute(sql`DELETE FROM formas_pagamento`);
  await db.execute(sql`DELETE FROM linhas_margem`);
  await db.execute(sql`DELETE FROM unidades`);
  await db.execute(sql`DELETE FROM users`);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
}

export const adminUser: SessionUser = {
  id: 1,
  email: 'admin@test.local',
  nome: 'Test Admin',
  role: 'admin',
  unidadeId: null,
};

export const regularUser: SessionUser = {
  id: 2,
  email: 'user@test.local',
  nome: 'Test User',
  role: 'user',
  unidadeId: null,
};

export function makeContext(user: SessionUser | null = adminUser): AppContext {
  return {
    req: {} as any,
    res: {} as any,
    user,
  };
}

export function makeCaller(user: SessionUser | null = adminUser) {
  return appRouter.createCaller(makeContext(user));
}

/** Seed mínimo: 1 unidade, 1 categoria de receita, 1 categoria de despesa, 1 forma pag, 1 fornecedor. */
export async function seedMinimo(db: MySql2Database<typeof fullSchema>) {
  await db.insert(schema.unidades).values({ nome: 'Unidade Teste' });
  await db.insert(schema.formasPagamento).values({ nome: 'PIX' });
  await db.insert(schema.fornecedores).values({ nome: 'Fornecedor Teste', documento: '12345678000190' });
  await db.insert(schema.linhasMargem).values({ nome: 'Fraldas' });
  await db.insert(schema.categorias).values([
    { nome: 'Hospedagem', grupo: 'Receita', natureza: 'Receita' },
    { nome: 'Fraldas (custo)', grupo: 'Custo Direto', natureza: 'Custo' },
    { nome: 'Luz', grupo: 'Utilidades', natureza: 'Despesa' },
  ]);

  // Retorna os IDs criados (assume autoincrement começando do menor não usado).
  const [unidades] = await Promise.all([db.select().from(schema.unidades)]);
  const formas = await db.select().from(schema.formasPagamento);
  const fornecedores = await db.select().from(schema.fornecedores);
  const linhas = await db.select().from(schema.linhasMargem);
  const categorias = await db.select().from(schema.categorias);

  return {
    unidade: unidades[0],
    formaPag: formas[0],
    fornecedor: fornecedores[0],
    linhaMargem: linhas[0],
    catReceita: categorias.find((c) => c.natureza === 'Receita')!,
    catCusto: categorias.find((c) => c.natureza === 'Custo')!,
    catDespesa: categorias.find((c) => c.natureza === 'Despesa')!,
  };
}
