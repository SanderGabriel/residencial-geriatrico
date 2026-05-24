import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeCaller, resetTables, seedMinimo, setupTestDb, teardownTestDb } from './helpers';
import { auditLog, movimentacoes, titulos } from '../../drizzle/schema';

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => { db = await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
beforeEach(async () => { await resetTables(db); });

describe('titulos router (integration)', () => {
  it('create define saldo_em_aberto = valor_total - desconto e status Previsto', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id,
      tipo: 'Pagar',
      fornecedorId: seed.fornecedor.id,
      descricao: 'Conta de luz',
      valorTotal: 500,
      desconto: 50,
      dataVencimento: '2026-06-10',
      competencia: '06/2026',
    });
    expect(t.status).toBe('Previsto');
    expect(Number(t.saldoEmAberto)).toBe(450);
    expect(Number(t.valorRecebidoAcumulado)).toBe(0);
  });

  it('pagar total: status → Pago, saldo = 0, cria 1 movimentação Saída', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'Conta luz', valorTotal: 200, dataVencimento: '2026-06-10',
    });

    const r = await caller.titulos.pagar({
      tituloId: t.id,
      valorPagamento: 200,
      dataCaixa: '2026-06-05',
      competencia: '06/2026',
      formaPagamentoId: seed.formaPag.id,
      categoriaId: seed.catDespesa.id,
    });

    expect(r.titulo.status).toBe('Pago');
    expect(Number(r.titulo.saldoEmAberto)).toBe(0);
    expect(Number(r.titulo.valorRecebidoAcumulado)).toBe(200);

    const movs = await db.select().from(movimentacoes).where(eq(movimentacoes.tituloId, t.id));
    expect(movs).toHaveLength(1);
    expect(movs[0].tipo).toBe('Saída');
    expect(Number(movs[0].valorTotal)).toBe(200);
  });

  it('pagar parcial 2x: status Parcial após 1ª e Pago após 2ª', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'Aluguel', valorTotal: 1000, dataVencimento: '2026-06-10',
    });

    let r = await caller.titulos.pagar({
      tituloId: t.id, valorPagamento: 400,
      dataCaixa: '2026-06-05', competencia: '06/2026',
      categoriaId: seed.catDespesa.id,
    });
    expect(r.titulo.status).toBe('Parcial');
    expect(Number(r.titulo.saldoEmAberto)).toBe(600);

    r = await caller.titulos.pagar({
      tituloId: t.id, valorPagamento: 600,
      dataCaixa: '2026-06-10', competencia: '06/2026',
      categoriaId: seed.catDespesa.id,
    });
    expect(r.titulo.status).toBe('Pago');
    expect(Number(r.titulo.saldoEmAberto)).toBe(0);
    expect(Number(r.titulo.valorRecebidoAcumulado)).toBe(1000);

    const movs = await db.select().from(movimentacoes).where(eq(movimentacoes.tituloId, t.id));
    expect(movs).toHaveLength(2);
  });

  it('pagar título tipo Receber gera Entrada e status vira Recebido', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Receber',
      descricao: 'Mensalidade', valorTotal: 3000, dataVencimento: '2026-06-10',
    });
    const r = await caller.titulos.pagar({
      tituloId: t.id, valorPagamento: 3000,
      dataCaixa: '2026-06-05', competencia: '06/2026',
      categoriaId: seed.catReceita.id,
    });
    expect(r.titulo.status).toBe('Recebido');

    const movs = await db.select().from(movimentacoes).where(eq(movimentacoes.tituloId, t.id));
    expect(movs[0].tipo).toBe('Entrada');
  });

  it('rejeita pagamento maior que saldo', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'X', valorTotal: 100, dataVencimento: '2026-06-10',
    });
    await expect(
      caller.titulos.pagar({
        tituloId: t.id, valorPagamento: 200,
        dataCaixa: '2026-06-05', competencia: '06/2026',
        categoriaId: seed.catDespesa.id,
      }),
    ).rejects.toThrow(/saldo/i);
  });

  it('rejeita pagamento em título cancelado', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'X', valorTotal: 100, dataVencimento: '2026-06-10',
    });
    await caller.titulos.update({ id: t.id, status: 'Cancelado' });

    await expect(
      caller.titulos.pagar({
        tituloId: t.id, valorPagamento: 100,
        dataCaixa: '2026-06-05', competencia: '06/2026',
        categoriaId: seed.catDespesa.id,
      }),
    ).rejects.toThrow(/cancel/i);
  });

  it('list filtra por tipo e status', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'A', valorTotal: 100, dataVencimento: '2026-06-10',
    });
    await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Receber',
      descricao: 'B', valorTotal: 200, dataVencimento: '2026-06-15',
    });

    expect((await caller.titulos.list({ tipo: 'Pagar' })).items).toHaveLength(1);
    expect((await caller.titulos.list({ tipo: 'Receber' })).items).toHaveLength(1);
    expect((await caller.titulos.list({ status: 'Previsto' })).items).toHaveLength(2);
  });

  it('update recalcula saldo quando muda valor_total', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'X', valorTotal: 500, dataVencimento: '2026-06-10',
    });

    // Paga 200 → saldo 300
    await caller.titulos.pagar({
      tituloId: t.id, valorPagamento: 200,
      dataCaixa: '2026-06-05', competencia: '06/2026',
      categoriaId: seed.catDespesa.id,
    });
    let cur = await caller.titulos.get({ id: t.id });
    expect(Number(cur.saldoEmAberto)).toBe(300);
    expect(cur.status).toBe('Parcial');

    // Reduz para 200 → saldo 0, status Pago
    await caller.titulos.update({ id: t.id, valorTotal: 200 });
    cur = await caller.titulos.get({ id: t.id });
    expect(Number(cur.saldoEmAberto)).toBe(0);
    expect(cur.status).toBe('Pago');
  });

  it('pagar grava auditoria com antes/depois do título', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();

    const t = await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'X', valorTotal: 100, dataVencimento: '2026-06-10',
    });
    await caller.titulos.pagar({
      tituloId: t.id, valorPagamento: 100,
      dataCaixa: '2026-06-05', competencia: '06/2026',
      categoriaId: seed.catDespesa.id,
    });

    const logs = await db.select().from(auditLog).where(eq(auditLog.tabela, 'titulos'));
    // 1 CREATE + 1 UPDATE (do pagar) — o UPDATE de status durante pagar é logado
    expect(logs.filter((l) => l.acao === 'CREATE')).toHaveLength(1);
    expect(logs.filter((l) => l.acao === 'UPDATE')).toHaveLength(1);
    const upd = logs.find((l) => l.acao === 'UPDATE')!;
    expect((upd.dadosAntes as any).status).toBe('Previsto');
    expect((upd.dadosDepois as any).status).toBe('Pago');
  });
});

describe('audit router (integration)', () => {
  it('admin pode listar, user comum não', async () => {
    const seed = await seedMinimo(db);
    const admin = makeCaller();
    await admin.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'X', valorTotal: 100, dataVencimento: '2026-06-10',
    });

    const list = await admin.audit.list();
    expect(list.items.length).toBeGreaterThan(0);

    const userCaller = makeCaller({ id: 99, email: 'u@x', nome: 'u', role: 'user', unidadeId: null });
    await expect(userCaller.audit.list()).rejects.toThrow(/admin/i);
  });

  it('filtra por tabela e ação', async () => {
    const seed = await seedMinimo(db);
    const caller = makeCaller();
    await caller.titulos.create({
      unidadeId: seed.unidade.id, tipo: 'Pagar', fornecedorId: seed.fornecedor.id,
      descricao: 'X', valorTotal: 100, dataVencimento: '2026-06-10',
    });

    const titulosLog = await caller.audit.list({ tabela: 'titulos' });
    expect(titulosLog.items.every((l) => l.tabela === 'titulos')).toBe(true);

    const creates = await caller.audit.list({ acao: 'CREATE' });
    expect(creates.items.every((l) => l.acao === 'CREATE')).toBe(true);
  });
});
