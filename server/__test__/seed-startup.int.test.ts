/**
 * Valida o fluxo de boot em produção: migrations + seed automáticos
 * aplicados sobre um banco vazio. Simula o que vai acontecer no Railway
 * (ou qualquer host) na primeira vez que o servidor sobe contra um DB novo.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { sql } from 'drizzle-orm';
import path from 'node:path';
import { runSeed } from '../../drizzle/seed-data';
import {
  categorias,
  formasPagamento,
  linhasMargem,
  unidades,
} from '../../drizzle/schema';

const BOOTSTRAP_DB_URL = (
  process.env.TEST_DATABASE_URL ?? 'mysql://root:root@127.0.0.1:3306/novo_lar_test'
).replace(/\/[^/]+$/, '/novo_lar_bootstrap');

let pool: mysql.Pool;

beforeAll(async () => {
  // Garante DB limpo
  const root = await mysql.createConnection(
    BOOTSTRAP_DB_URL.replace(/\/[^/]+$/, '/'),
  );
  await root.execute('DROP DATABASE IF EXISTS novo_lar_bootstrap');
  await root.execute('CREATE DATABASE novo_lar_bootstrap');
  await root.end();
  pool = mysql.createPool(BOOTSTRAP_DB_URL);
});

afterAll(async () => {
  if (pool) await pool.end();
});

describe('auto-migrate + auto-seed no boot (DB virgem)', () => {
  it('aplica migrations e popula 4/5/9/43 sem erro', async () => {
    const db = drizzle(pool);

    // Migrations
    const migrationsFolder = path.resolve(process.cwd(), 'drizzle/migrations');
    await migrate(db, { migrationsFolder });

    // Verifica que as tabelas existem
    const tabelas = await db.execute(sql`SHOW TABLES`);
    expect(Array.isArray(tabelas[0])).toBe(true);
    expect((tabelas[0] as unknown[]).length).toBeGreaterThanOrEqual(10);

    // Seed
    const r = await runSeed(db);
    expect(r.inseridas.unidades).toBe(4);
    expect(r.inseridas.formas).toBe(5);
    expect(r.inseridas.linhas).toBe(9);
    expect(r.inseridas.categorias).toBe(43);

    // Confere contagens
    const u = await db.select().from(unidades);
    expect(u).toHaveLength(4);
    const f = await db.select().from(formasPagamento);
    expect(f).toHaveLength(5);
    const l = await db.select().from(linhasMargem);
    expect(l).toHaveLength(9);
    const c = await db.select().from(categorias);
    expect(c).toHaveLength(43);
  });

  it('segunda execução é idempotente (zero inserts, todos "já existiam")', async () => {
    const db = drizzle(pool);
    const r = await runSeed(db);
    expect(r.inseridas.unidades).toBe(0);
    expect(r.inseridas.formas).toBe(0);
    expect(r.inseridas.linhas).toBe(0);
    expect(r.inseridas.categorias).toBe(0);
    expect(r.existentes.unidades).toBe(4);
    expect(r.existentes.categorias).toBe(43);
  });

  it('migrate roda 2x sem erro (idempotente via tabela __drizzle_migrations)', async () => {
    const db = drizzle(pool);
    const migrationsFolder = path.resolve(process.cwd(), 'drizzle/migrations');
    // Não deve lançar
    await expect(migrate(db, { migrationsFolder })).resolves.not.toThrow();
  });
});
