import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeCaller, resetTables, setupTestDb, teardownTestDb } from './helpers';
import { categorias, movimentacoes, rateios, unidades } from '../../drizzle/schema';

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => { db = await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => { await resetTables(db); });

describe('categorias router (integration)', () => {
  it('create exige natureza válida (enum)', async () => {
    const caller = makeCaller();
    await expect(
      // @ts-expect-error testando runtime validation
      caller.categorias.create({ nome: 'X', grupo: 'Y', natureza: 'Inexistente' }),
    ).rejects.toThrow();
  });

  it('aceita as 6 naturezas do enum', async () => {
    const caller = makeCaller();
    const naturezas = ['Receita', 'Custo', 'Despesa', 'Imposto', 'Investimento', 'Não Operacional'] as const;
    for (const n of naturezas) {
      const c = await caller.categorias.create({ nome: `Cat ${n}`, grupo: 'G', natureza: n });
      expect(c.natureza).toBe(n);
    }
    expect(await caller.categorias.list()).toHaveLength(6);
  });

  it('filtra por grupo e natureza', async () => {
    const caller = makeCaller();
    await caller.categorias.create({ nome: 'A1', grupo: 'Receita', natureza: 'Receita' });
    await caller.categorias.create({ nome: 'A2', grupo: 'Custo Direto', natureza: 'Custo' });
    await caller.categorias.create({ nome: 'A3', grupo: 'Custo Direto', natureza: 'Custo' });

    expect(await caller.categorias.list({ grupo: 'Custo Direto' })).toHaveLength(2);
    expect(await caller.categorias.list({ natureza: 'Custo' })).toHaveLength(2);
    expect(await caller.categorias.list({ grupo: 'X' })).toHaveLength(0);
  });

  it('nome duplicado é rejeitado (case-insensível via collation default)', async () => {
    const caller = makeCaller();
    await caller.categorias.create({ nome: 'Hospedagem', grupo: 'Receita', natureza: 'Receita' });
    await expect(
      caller.categorias.create({ nome: 'Hospedagem', grupo: 'X', natureza: 'Receita' }),
    ).rejects.toThrow(/já existe/i);
    // utf8mb4_general_ci é case-insensível
    await expect(
      caller.categorias.create({ nome: 'HOSPEDAGEM', grupo: 'X', natureza: 'Receita' }),
    ).rejects.toThrow(/já existe/i);
  });

  it('delete bloqueia se categoria tem rateios vinculados', async () => {
    const caller = makeCaller();
    const cat = await caller.categorias.create({ nome: 'C1', grupo: 'X', natureza: 'Despesa' });

    // Cria uma movimentação que use essa categoria
    await db.insert(unidades).values({ nome: 'U1' });
    const u = (await db.select().from(unidades))[0];
    const [movResult] = await db.insert(movimentacoes).values({
      unidadeId: u.id,
      tipo: 'Saída',
      dataCaixa: '2026-05-01',
      competencia: '05/2026',
      valorTotal: '100.00',
      desconto: '0.00',
      frete: '0.00',
      valorLiquido: '100.00',
    });
    await db.insert(rateios).values({
      movimentacaoId: (movResult as any).insertId,
      categoriaId: cat.id,
      valorBruto: '100.00',
      valorLiquidoFinal: '100.00',
    });

    await expect(caller.categorias.delete({ id: cat.id })).rejects.toThrow(/vinculada/i);

    // Deve continuar existindo
    const ainda = await db.select().from(categorias).where(eq(categorias.id, cat.id));
    expect(ainda[0].deletedAt).toBeNull();
  });

  it('delete permite após remover rateios', async () => {
    const caller = makeCaller();
    const cat = await caller.categorias.create({ nome: 'C2', grupo: 'X', natureza: 'Despesa' });
    await caller.categorias.delete({ id: cat.id });

    const ainda = await db.select().from(categorias).where(eq(categorias.id, cat.id));
    expect(ainda[0].deletedAt).not.toBeNull();
  });

  it('update sem alterar nome não bate em uniqueness', async () => {
    const caller = makeCaller();
    const c = await caller.categorias.create({ nome: 'Stable', grupo: 'A', natureza: 'Despesa' });
    const updated = await caller.categorias.update({ id: c.id, grupo: 'B' });
    expect(updated.grupo).toBe('B');
    expect(updated.nome).toBe('Stable');
  });
});
