import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  makeCaller,
  resetTables,
  seedMinimo,
  setupTestDb,
  teardownTestDb,
} from './helpers';
import { auditLog, movimentacoes, rateios } from '../../drizzle/schema';

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => { db = await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => { await resetTables(db); });

describe('movimentacoes router (integration)', () => {
  it('create grava movimentação + N rateios + auditoria, em transação', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const result = await caller.movimentacoes.create({
      unidadeId: seed.unidade.id,
      tipo: 'Saída',
      dataCaixa: '2026-05-15',
      competencia: '05/2026',
      valorTotal: 200,
      desconto: 0,
      frete: 0,
      formaPagamentoId: seed.formaPag.id,
      fornecedorId: seed.fornecedor.id,
      beneficiario: 'Loja X',
      rateios: [
        { categoriaId: seed.catCusto.id, valor: 150 },
        { categoriaId: seed.catDespesa.id, valor: 50 },
      ],
    });
    expect(result.id).toBeGreaterThan(0);

    const got = await caller.movimentacoes.get({ id: result.id });
    expect(got.tipo).toBe('Saída');
    expect(Number(got.valorTotal)).toBe(200);
    expect(Number(got.valorLiquido)).toBe(200);
    expect(got.rateios).toHaveLength(2);
    const valoresOrdenados = got.rateios.map((r) => Number(r.valorLiquidoFinal)).sort((a, b) => a - b);
    expect(valoresOrdenados).toEqual([50, 150]);

    const logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tabela, 'movimentacoes'));
    expect(logs).toHaveLength(1);
    expect(logs[0].acao).toBe('CREATE');
  });

  it('rateios proporcionais com desconto: soma final == valor_total - desconto + frete', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const m = await caller.movimentacoes.create({
      unidadeId: seed.unidade.id,
      tipo: 'Saída',
      dataCaixa: '2026-05-15',
      competencia: '05/2026',
      valorTotal: 100,
      desconto: 10,
      frete: 5,
      rateios: [
        { categoriaId: seed.catCusto.id, valor: 70 },
        { categoriaId: seed.catDespesa.id, valor: 30 },
      ],
    });

    const got = await caller.movimentacoes.get({ id: m.id });
    expect(Number(got.valorLiquido)).toBe(95); // 100 - 10 + 5

    const somaDesc = got.rateios.reduce((a, r) => a + Number(r.descontoRateado), 0);
    const somaFrete = got.rateios.reduce((a, r) => a + Number(r.freteRateado), 0);
    const somaLiquido = got.rateios.reduce((a, r) => a + Number(r.valorLiquidoFinal), 0);
    expect(somaDesc).toBeCloseTo(10, 2);
    expect(somaFrete).toBeCloseTo(5, 2);
    expect(somaLiquido).toBeCloseTo(95, 2);
  });

  it('rejeita soma de rateios diferente de valor_total (fora da tolerância)', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    await expect(
      caller.movimentacoes.create({
        unidadeId: seed.unidade.id,
        tipo: 'Saída',
        dataCaixa: '2026-05-15',
        competencia: '05/2026',
        valorTotal: 100,
        rateios: [{ categoriaId: seed.catCusto.id, valor: 50 }],
      }),
    ).rejects.toThrow();
  });

  it('rejeita lista de rateios vazia', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    await expect(
      caller.movimentacoes.create({
        unidadeId: seed.unidade.id,
        tipo: 'Saída',
        dataCaixa: '2026-05-15',
        competencia: '05/2026',
        valorTotal: 100,
        rateios: [],
      }),
    ).rejects.toThrow();
  });

  it('rejeita competência em formato inválido', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    await expect(
      caller.movimentacoes.create({
        unidadeId: seed.unidade.id,
        tipo: 'Saída',
        dataCaixa: '2026-05-15',
        competencia: '5/2026', // sem zero à esquerda
        valorTotal: 100,
        rateios: [{ categoriaId: seed.catCusto.id, valor: 100 }],
      }),
    ).rejects.toThrow(/MM\/AAAA/i);
  });

  it('rejeita unidade inexistente', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    await expect(
      caller.movimentacoes.create({
        unidadeId: 99999,
        tipo: 'Saída',
        dataCaixa: '2026-05-15',
        competencia: '05/2026',
        valorTotal: 100,
        rateios: [{ categoriaId: seed.catCusto.id, valor: 100 }],
      }),
    ).rejects.toThrow();
  });

  it('list filtra por período, tipo, unidade e categoria', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-04-10', competencia: '04/2026',
      valorTotal: 1000, rateios: [{ categoriaId: seed.catReceita.id, valor: 1000 }],
    });
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-10', competencia: '05/2026',
      valorTotal: 200, rateios: [{ categoriaId: seed.catCusto.id, valor: 200 }],
    });
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-20', competencia: '05/2026',
      valorTotal: 300, rateios: [{ categoriaId: seed.catDespesa.id, valor: 300 }],
    });

    expect((await caller.movimentacoes.list({ tipo: 'Entrada' })).items).toHaveLength(1);
    expect((await caller.movimentacoes.list({ tipo: 'Saída' })).items).toHaveLength(2);
    expect((await caller.movimentacoes.list({ periodoInicio: '2026-05-01' })).items).toHaveLength(2);
    expect((await caller.movimentacoes.list({ periodoFim: '2026-04-30' })).items).toHaveLength(1);
    expect((await caller.movimentacoes.list({ competencia: '05/2026' })).items).toHaveLength(2);
    expect((await caller.movimentacoes.list({ categoriaId: seed.catCusto.id })).items).toHaveLength(1);
    expect((await caller.movimentacoes.list({ categoriaId: seed.catReceita.id })).items).toHaveLength(1);
  });

  it('update recalcula rateios quando muda desconto', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const m = await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 100, desconto: 0, frete: 0,
      rateios: [
        { categoriaId: seed.catCusto.id, valor: 60 },
        { categoriaId: seed.catDespesa.id, valor: 40 },
      ],
    });

    await caller.movimentacoes.update({ id: m.id, desconto: 20 });

    const got = await caller.movimentacoes.get({ id: m.id });
    expect(Number(got.desconto)).toBe(20);
    expect(Number(got.valorLiquido)).toBe(80);
    const somaDesc = got.rateios.reduce((a, r) => a + Number(r.descontoRateado), 0);
    expect(somaDesc).toBeCloseTo(20, 2);
    // distribuição 60/40 → 12/8
    const rCusto = got.rateios.find((r) => r.categoriaId === seed.catCusto.id)!;
    expect(Number(rCusto.descontoRateado)).toBeCloseTo(12, 2);
  });

  it('delete = soft delete; aparece como ausente no list mas auditoria registra', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const m = await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 100,
      rateios: [{ categoriaId: seed.catCusto.id, valor: 100 }],
    });
    await caller.movimentacoes.delete({ id: m.id });

    expect((await caller.movimentacoes.list()).items).toHaveLength(0);
    const linha = await db.select().from(movimentacoes).where(eq(movimentacoes.id, m.id));
    expect(linha[0].deletedAt).not.toBeNull();
    // Rateios continuam (cascade só dispara em DELETE físico, não soft)
    expect(await db.select().from(rateios).where(eq(rateios.movimentacaoId, m.id))).toHaveLength(1);
  });

  it('3 rateios desiguais: residual de arredondamento absorvido pelo último', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    // 33.33 + 33.33 + 33.34 = 100
    const cat3 = await caller.categorias.create({ nome: 'Cat3', grupo: 'X', natureza: 'Despesa' });

    const m = await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 100, desconto: 10, frete: 0,
      rateios: [
        { categoriaId: seed.catCusto.id, valor: 33.33 },
        { categoriaId: seed.catDespesa.id, valor: 33.33 },
        { categoriaId: cat3.id, valor: 33.34 },
      ],
    });

    const got = await caller.movimentacoes.get({ id: m.id });
    const somaDesc = got.rateios.reduce((a, r) => a + Number(r.descontoRateado), 0);
    expect(somaDesc).toBeCloseTo(10, 2);
    // Validação centavo-perfeita
    expect(Math.round(somaDesc * 100)).toBe(1000);
  });
});
