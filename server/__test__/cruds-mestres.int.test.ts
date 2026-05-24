/**
 * Cobertura de update/delete dos 3 routers mestres mais simples: fornecedores,
 * formas-pagamento, linhas-margem. Os fluxos do dia-a-dia (create + list)
 * já estão cobertos via E2E e seed; aqui exercitamos os caminhos de UPDATE
 * que reordenam estado e DELETE que precisa validar vínculos.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeCaller, resetTables, setupTestDb, teardownTestDb } from './helpers';
import { fornecedores, formasPagamento, linhasMargem } from '../../drizzle/schema';

let db: Awaited<ReturnType<typeof setupTestDb>>;
beforeAll(async () => { db = await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => { await resetTables(db); });

describe('fornecedores: CRUD completo', () => {
  it('update preserva e ignora campos não enviados', async () => {
    const caller = makeCaller();
    const f = await caller.fornecedores.create({
      nome: 'X', documento: '12345678900', telefone: '11999999999', email: 'a@b.com',
    });
    const upd = await caller.fornecedores.update({ id: f.id, telefone: '21888888888' });
    expect(upd.telefone).toBe('21888888888');
    expect(upd.nome).toBe('X');
    expect(upd.documento).toBe('12345678900');
    expect(upd.email).toBe('a@b.com');
  });

  it('update documento duplicado é rejeitado', async () => {
    const caller = makeCaller();
    await caller.fornecedores.create({ nome: 'A', documento: '11111111111' });
    const b = await caller.fornecedores.create({ nome: 'B', documento: '22222222222' });
    await expect(
      caller.fornecedores.update({ id: b.id, documento: '11111111111' }),
    ).rejects.toThrow(/já existe/i);
  });

  it('update p/ email vazio limpa o campo (null)', async () => {
    const caller = makeCaller();
    const f = await caller.fornecedores.create({ nome: 'X', email: 'a@b.com' });
    await caller.fornecedores.update({ id: f.id, email: '' });
    const row = (await db.select().from(fornecedores).where(eq(fornecedores.id, f.id)))[0];
    expect(row.email).toBeNull();
  });

  it('delete soft + get falha + ainda no DB com deletedAt', async () => {
    const caller = makeCaller();
    const f = await caller.fornecedores.create({ nome: 'X' });
    await caller.fornecedores.delete({ id: f.id });
    await expect(caller.fornecedores.get({ id: f.id })).rejects.toThrow();
    const row = (await db.select().from(fornecedores).where(eq(fornecedores.id, f.id)))[0];
    expect(row.deletedAt).not.toBeNull();
  });

  it('list incluirInativos=true retorna soft-deletados', async () => {
    const caller = makeCaller();
    const a = await caller.fornecedores.create({ nome: 'A' });
    await caller.fornecedores.delete({ id: a.id });
    expect((await caller.fornecedores.list()).length).toBe(0);
    expect((await caller.fornecedores.list({ incluirInativos: true })).length).toBe(1);
  });
});

describe('formas_pagamento: CRUD completo', () => {
  it('update muda nome', async () => {
    const caller = makeCaller();
    const f = await caller.formasPagamento.create({ nome: 'Banco' });
    const upd = await caller.formasPagamento.update({ id: f.id, nome: 'Banco do Brasil' });
    expect(upd.nome).toBe('Banco do Brasil');
  });

  it('update p/ nome duplicado é rejeitado', async () => {
    const caller = makeCaller();
    await caller.formasPagamento.create({ nome: 'PIX' });
    const b = await caller.formasPagamento.create({ nome: 'TED' });
    await expect(
      caller.formasPagamento.update({ id: b.id, nome: 'PIX' }),
    ).rejects.toThrow(/já existe/i);
  });

  it('delete soft + restored via incluirInativas', async () => {
    const caller = makeCaller();
    const f = await caller.formasPagamento.create({ nome: 'PIX' });
    await caller.formasPagamento.delete({ id: f.id });
    const row = (
      await db.select().from(formasPagamento).where(eq(formasPagamento.id, f.id))
    )[0];
    expect(row.deletedAt).not.toBeNull();
    expect((await caller.formasPagamento.list({ incluirInativas: true })).length).toBe(1);
  });

  it('get em id inexistente => NOT_FOUND', async () => {
    const caller = makeCaller();
    await expect(caller.formasPagamento.get({ id: 9999 })).rejects.toThrow();
  });
});

describe('linhas_margem: CRUD completo', () => {
  it('create com requer_nome_customizado=true', async () => {
    const caller = makeCaller();
    const l = await caller.linhasMargem.create({
      nome: 'Outros',
      requerNomeCustomizado: true,
      descricao: 'Linha genérica',
    });
    expect(l.requerNomeCustomizado).toBe(true);
    expect(l.descricao).toBe('Linha genérica');
  });

  it('update muda flag requer_nome_customizado', async () => {
    const caller = makeCaller();
    const l = await caller.linhasMargem.create({ nome: 'Fraldas' });
    expect(l.requerNomeCustomizado).toBe(false);
    const upd = await caller.linhasMargem.update({ id: l.id, requerNomeCustomizado: true });
    expect(upd.requerNomeCustomizado).toBe(true);
  });

  it('update nome duplicado é rejeitado', async () => {
    const caller = makeCaller();
    await caller.linhasMargem.create({ nome: 'A' });
    const b = await caller.linhasMargem.create({ nome: 'B' });
    await expect(caller.linhasMargem.update({ id: b.id, nome: 'A' })).rejects.toThrow(/já existe/i);
  });

  it('delete sem vínculos funciona (soft)', async () => {
    const caller = makeCaller();
    const l = await caller.linhasMargem.create({ nome: 'X' });
    await caller.linhasMargem.delete({ id: l.id });
    const row = (await db.select().from(linhasMargem).where(eq(linhasMargem.id, l.id)))[0];
    expect(row.deletedAt).not.toBeNull();
  });

  it('get em id inexistente => NOT_FOUND', async () => {
    const caller = makeCaller();
    await expect(caller.linhasMargem.get({ id: 9999 })).rejects.toThrow();
  });

  it('list filtra ativa=false por padrão; incluirInativas mostra tudo', async () => {
    const caller = makeCaller();
    const a = await caller.linhasMargem.create({ nome: 'A' });
    await caller.linhasMargem.create({ nome: 'B' });
    await caller.linhasMargem.update({ id: a.id, ativa: false });
    expect((await caller.linhasMargem.list()).length).toBe(1); // só B
    expect((await caller.linhasMargem.list({ incluirInativas: true })).length).toBe(2);
  });
});
