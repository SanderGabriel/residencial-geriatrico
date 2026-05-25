import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  makeCaller,
  resetTables,
  seedMinimo,
  setupTestDb,
  teardownTestDb,
} from './helpers';

let db: Awaited<ReturnType<typeof setupTestDb>>;
beforeAll(async () => { db = await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => { await resetTables(db); });

describe('relatorios.porNatureza', () => {
  it('zeros quando não há movimentações', async () => {
    const caller = makeCaller();
    const r = await caller.relatorios.porNatureza();
    expect(r.totais.Receita).toBe(0);
    expect(r.totais.Custo).toBe(0);
    expect(r.margem).toBe(0);
    expect(r.margemPct).toBe(0);
  });

  it('soma corretamente receita e custo, calcula margem', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    // 1000 de receita
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 1000, rateios: [{ categoriaId: seed.catReceita.id, valor: 1000 }],
    });
    // 300 de custo
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-16', competencia: '05/2026',
      valorTotal: 300, rateios: [{ categoriaId: seed.catCusto.id, valor: 300 }],
    });
    // 200 de despesa
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-17', competencia: '05/2026',
      valorTotal: 200, rateios: [{ categoriaId: seed.catDespesa.id, valor: 200 }],
    });

    const r = await caller.relatorios.porNatureza();
    expect(r.totais.Receita).toBe(1000);
    expect(r.totais.Custo).toBe(300);
    expect(r.totais.Despesa).toBe(200);
    expect(r.margem).toBe(700);
    expect(r.margemPct).toBeCloseTo(70, 1);
  });

  it('filtra por período', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-04-15', competencia: '04/2026',
      valorTotal: 500, rateios: [{ categoriaId: seed.catReceita.id, valor: 500 }],
    });
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 700, rateios: [{ categoriaId: seed.catReceita.id, valor: 700 }],
    });

    const apenasAbril = await caller.relatorios.porNatureza({
      periodoInicio: '2026-04-01',
      periodoFim: '2026-04-30',
    });
    expect(apenasAbril.totais.Receita).toBe(500);

    const apenasMaio = await caller.relatorios.porNatureza({ competencia: '05/2026' });
    expect(apenasMaio.totais.Receita).toBe(700);
  });

  it('filtra por unidade', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    const outra = await caller.unidades.create({ nome: 'Outra' });

    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 100, rateios: [{ categoriaId: seed.catReceita.id, valor: 100 }],
    });
    await caller.movimentacoes.create({
      unidadeId: outra.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 200, rateios: [{ categoriaId: seed.catReceita.id, valor: 200 }],
    });

    const u1 = await caller.relatorios.porNatureza({ unidadeId: seed.unidade.id });
    expect(u1.totais.Receita).toBe(100);
    const u2 = await caller.relatorios.porNatureza({ unidadeId: outra.id });
    expect(u2.totais.Receita).toBe(200);
  });

  it('ignora movimentações soft-deleted', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    const m1 = await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 100, rateios: [{ categoriaId: seed.catReceita.id, valor: 100 }],
    });
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 200, rateios: [{ categoriaId: seed.catReceita.id, valor: 200 }],
    });
    await caller.movimentacoes.delete({ id: m1.id });

    const r = await caller.relatorios.porNatureza();
    expect(r.totais.Receita).toBe(200);
  });
});

describe('relatorios.porLinhaMargem', () => {
  it('pivota entrada/saida por linha', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    // Receita 1000 em Fraldas
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 1000, linhaMargemId: seed.linhaMargem.id,
      rateios: [{ categoriaId: seed.catReceita.id, valor: 1000 }],
    });
    // Custo 400 em Fraldas
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-16', competencia: '05/2026',
      valorTotal: 400, linhaMargemId: seed.linhaMargem.id,
      rateios: [{ categoriaId: seed.catCusto.id, valor: 400 }],
    });

    const r = await caller.relatorios.porLinhaMargem();
    const fraldas = r.itens.find((i) => i.linhaNome === seed.linhaMargem.nome);
    expect(fraldas).toBeTruthy();
    expect(fraldas!.entrada).toBe(1000);
    expect(fraldas!.saida).toBe(400);
    expect(fraldas!.margem).toBe(600);
    expect(fraldas!.margemPct).toBeCloseTo(60, 1);
  });

  it('inclui movimentações sem linha_margem como "(Sem linha)"', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 500, // sem linhaMargemId
      rateios: [{ categoriaId: seed.catReceita.id, valor: 500 }],
    });
    const r = await caller.relatorios.porLinhaMargem();
    const sem = r.itens.find((i) => i.linhaId === null);
    expect(sem).toBeTruthy();
    expect(sem!.entrada).toBe(500);
  });
});

describe('relatorios.porUnidade', () => {
  it('agrupa entradas e saídas por casa', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    const outra = await caller.unidades.create({ nome: 'Outra' });

    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 1000, rateios: [{ categoriaId: seed.catReceita.id, valor: 1000 }],
    });
    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Saída',
      dataCaixa: '2026-05-16', competencia: '05/2026',
      valorTotal: 300, rateios: [{ categoriaId: seed.catCusto.id, valor: 300 }],
    });
    await caller.movimentacoes.create({
      unidadeId: outra.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 800, rateios: [{ categoriaId: seed.catReceita.id, valor: 800 }],
    });

    const r = await caller.relatorios.porUnidade();
    expect(r.itens).toHaveLength(2);
    const u1 = r.itens.find((i) => i.unidadeId === seed.unidade.id)!;
    expect(u1.entrada).toBe(1000);
    expect(u1.saida).toBe(300);
    expect(u1.saldo).toBe(700);
    const u2 = r.itens.find((i) => i.unidadeId === outra.id)!;
    expect(u2.saldo).toBe(800);
  });

  it('ordena por saldo desc', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    const outra = await caller.unidades.create({ nome: 'Maior' });

    await caller.movimentacoes.create({
      unidadeId: seed.unidade.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 100, rateios: [{ categoriaId: seed.catReceita.id, valor: 100 }],
    });
    await caller.movimentacoes.create({
      unidadeId: outra.id, tipo: 'Entrada',
      dataCaixa: '2026-05-15', competencia: '05/2026',
      valorTotal: 5000, rateios: [{ categoriaId: seed.catReceita.id, valor: 5000 }],
    });

    const r = await caller.relatorios.porUnidade();
    expect(r.itens[0].unidadeId).toBe(outra.id);
    expect(r.itens[1].unidadeId).toBe(seed.unidade.id);
  });
});
