import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  makeCaller,
  resetTables,
  setupTestDb,
  teardownTestDb,
  regularUser,
} from './helpers';
import { auditLog } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
beforeEach(async () => {
  await resetTables(db);
});

describe('unidades router (integration)', () => {
  it('lista vazio quando não há nada', async () => {
    const caller = makeCaller();
    const list = await caller.unidades.list();
    expect(list).toEqual([]);
  });

  it('create + list + get', async () => {
    const caller = makeCaller();
    const created = await caller.unidades.create({ nome: 'Casa Verde', descricao: '10 leitos' });
    expect(created.id).toBeGreaterThan(0);
    expect(created.nome).toBe('Casa Verde');

    const list = await caller.unidades.list();
    expect(list).toHaveLength(1);
    expect(list[0].nome).toBe('Casa Verde');

    const got = await caller.unidades.get({ id: created.id });
    expect(got.descricao).toBe('10 leitos');
  });

  it('rejeita nome duplicado', async () => {
    const caller = makeCaller();
    await caller.unidades.create({ nome: 'Casa Verde' });
    await expect(caller.unidades.create({ nome: 'Casa Verde' })).rejects.toThrow(/já existe/i);
  });

  it('update preserva campos não enviados e bloqueia conflito de nome', async () => {
    const caller = makeCaller();
    const a = await caller.unidades.create({ nome: 'Casa A', descricao: 'desc A' });
    await caller.unidades.create({ nome: 'Casa B' });

    const updated = await caller.unidades.update({ id: a.id, descricao: 'nova desc' });
    expect(updated.nome).toBe('Casa A');
    expect(updated.descricao).toBe('nova desc');

    await expect(caller.unidades.update({ id: a.id, nome: 'Casa B' })).rejects.toThrow(/já existe/i);
  });

  it('delete = soft delete: some do list mas não some do DB', async () => {
    const caller = makeCaller();
    const u = await caller.unidades.create({ nome: 'X' });
    await caller.unidades.delete({ id: u.id });

    const list = await caller.unidades.list();
    expect(list).toHaveLength(0);

    await expect(caller.unidades.get({ id: u.id })).rejects.toThrow();
  });

  it('get/update/delete em id inexistente => NOT_FOUND', async () => {
    const caller = makeCaller();
    await expect(caller.unidades.get({ id: 9999 })).rejects.toThrow();
    await expect(caller.unidades.update({ id: 9999, nome: 'X' })).rejects.toThrow();
    await expect(caller.unidades.delete({ id: 9999 })).rejects.toThrow();
  });

  it('valida input: nome vazio rejeitado', async () => {
    const caller = makeCaller();
    await expect(caller.unidades.create({ nome: '' })).rejects.toThrow();
    await expect(caller.unidades.create({ nome: '   ' })).rejects.toThrow();
  });

  it('cada mutation grava entrada de auditoria', async () => {
    const caller = makeCaller();
    const u = await caller.unidades.create({ nome: 'Audited' });
    await caller.unidades.update({ id: u.id, descricao: 'updated' });
    await caller.unidades.delete({ id: u.id });

    const logs = await db.select().from(auditLog).where(eq(auditLog.tabela, 'unidades'));
    expect(logs).toHaveLength(3);
    expect(logs.map((l) => l.acao).sort()).toEqual(['CREATE', 'DELETE', 'UPDATE']);
    expect(logs.every((l) => l.usuarioId === 1)).toBe(true);
  });

  it('contexto sem usuário => UNAUTHORIZED', async () => {
    const caller = makeCaller(null);
    await expect(caller.unidades.list()).rejects.toThrow(TRPCError);
  });

  it('user comum pode listar (não requer admin)', async () => {
    const caller = makeCaller(regularUser);
    expect(await caller.unidades.list()).toEqual([]);
  });
});
