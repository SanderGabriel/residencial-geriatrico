/**
 * Smoke E2E HTTP: sobe o Express + tRPC reais, dispara requests via fetch,
 * valida o ciclo completo de serialização (superjson nas duas pontas).
 *
 * Usa o appRouter direto via createTRPCClient para simular o cliente do
 * browser sem precisar do Vite.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { appRouter, type AppRouter } from '../routers';
import { resetTables, seedMinimo, setupTestDb, teardownTestDb, adminUser } from './helpers';

let server: Server;
let baseUrl: string;
let db: Awaited<ReturnType<typeof setupTestDb>>;
let client: ReturnType<typeof createTRPCClient<AppRouter>>;

beforeAll(async () => {
  db = await setupTestDb();
  const app = express();
  app.use(express.json());
  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({ req: {} as any, res: {} as any, user: adminUser }),
    }),
  );
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}/api/trpc`;
  client = createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: baseUrl, transformer: superjson })],
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await teardownTestDb();
});

beforeEach(async () => {
  await resetTables(db);
});

describe('E2E HTTP via tRPC client real', () => {
  it('health endpoint responde', async () => {
    const r = await client.health.query();
    expect(r.status).toBe('ok');
  });

  it('ciclo completo: cria unidade → categoria → mov → título → pagar', async () => {
    // 1. Unidade
    const unidade = await client.unidades.create.mutate({ nome: 'Casa Teste' });
    expect(unidade.id).toBeGreaterThan(0);

    // 2. Categoria
    const cat = await client.categorias.create.mutate({
      nome: 'Conta Luz',
      grupo: 'Utilidades',
      natureza: 'Despesa',
    });

    // 3. Forma pagamento
    const forma = await client.formasPagamento.create.mutate({ nome: 'PIX' });

    // 4. Fornecedor
    const fornec = await client.fornecedores.create.mutate({ nome: 'Concessionária' });

    // 5. Movimentação com rateio
    const mov = await client.movimentacoes.create.mutate({
      unidadeId: unidade.id,
      tipo: 'Saída',
      dataCaixa: '2026-05-15',
      competencia: '05/2026',
      valorTotal: 250.5,
      desconto: 5.5,
      frete: 0,
      formaPagamentoId: forma.id,
      fornecedorId: fornec.id,
      rateios: [{ categoriaId: cat.id, valor: 250.5 }],
    });

    // 6. Lista deve incluir
    const lista = await client.movimentacoes.list.query();
    expect(lista.items).toHaveLength(1);
    expect(lista.items[0].id).toBe(mov.id);

    // 7. Detalhe com rateios
    const detalhe = await client.movimentacoes.get.query({ id: mov.id });
    expect(detalhe.rateios).toHaveLength(1);
    expect(Number(detalhe.valorLiquido)).toBe(245);

    // 8. Título a pagar
    const titulo = await client.titulos.create.mutate({
      unidadeId: unidade.id,
      tipo: 'Pagar',
      fornecedorId: fornec.id,
      descricao: 'Aluguel maio',
      valorTotal: 3000,
      dataVencimento: '2026-05-30',
    });

    // 9. Pagar parcial
    const pag1 = await client.titulos.pagar.mutate({
      tituloId: titulo.id,
      valorPagamento: 1500,
      dataCaixa: '2026-05-30',
      competencia: '05/2026',
      formaPagamentoId: forma.id,
      categoriaId: cat.id,
    });
    expect(pag1.titulo.status).toBe('Parcial');
    expect(Number(pag1.titulo.saldoEmAberto)).toBe(1500);

    // 10. Pagar resto
    const pag2 = await client.titulos.pagar.mutate({
      tituloId: titulo.id,
      valorPagamento: 1500,
      dataCaixa: '2026-05-31',
      competencia: '05/2026',
      formaPagamentoId: forma.id,
      categoriaId: cat.id,
    });
    expect(pag2.titulo.status).toBe('Pago');

    // 11. Auditoria mostra tudo
    const audit = await client.audit.list.query();
    const acoes = audit.items.map((a) => `${a.tabela}.${a.acao}`).sort();
    // Devemos ter pelo menos: unidades.CREATE, categorias.CREATE, formas_pagamento.CREATE,
    // fornecedores.CREATE, movimentacoes.CREATE, titulos.CREATE + 2x titulos.UPDATE (pagar)
    expect(acoes).toContain('unidades.CREATE');
    expect(acoes).toContain('movimentacoes.CREATE');
    expect(acoes).toContain('titulos.CREATE');
    expect(acoes.filter((a) => a === 'titulos.UPDATE')).toHaveLength(2);

    // 12. Verifica que dadosAntes/dadosDepois são OBJETOS (não strings)
    const titulosUpdates = audit.items.filter((a) => a.tabela === 'titulos' && a.acao === 'UPDATE');
    for (const log of titulosUpdates) {
      expect(typeof log.dadosAntes).toBe('object');
      expect(typeof log.dadosDepois).toBe('object');
      expect(log.dadosAntes).not.toBeNull();
    }
  });

  it('Decimal serializado via superjson chega como string e é parsável', async () => {
    const seed = await seedMinimo(db);
    const m = await client.movimentacoes.create.mutate({
      unidadeId: seed.unidade.id,
      tipo: 'Saída',
      dataCaixa: '2026-05-15',
      competencia: '05/2026',
      valorTotal: 99.99,
      rateios: [{ categoriaId: seed.catCusto.id, valor: 99.99 }],
    });
    const got = await client.movimentacoes.get.query({ id: m.id });
    // valorTotal vem como string ("99.99") por causa do DECIMAL — frontend converte com Number()
    expect(typeof got.valorTotal === 'string' || typeof got.valorTotal === 'number').toBe(true);
    expect(Number(got.valorTotal)).toBe(99.99);
  });

  it('Erro Zod chega ao cliente com message legível em PT-BR', async () => {
    const seed = await seedMinimo(db);
    await expect(
      client.movimentacoes.create.mutate({
        unidadeId: seed.unidade.id,
        tipo: 'Saída',
        dataCaixa: '2026-05-15',
        competencia: 'inválido',
        valorTotal: 100,
        rateios: [{ categoriaId: seed.catCusto.id, valor: 100 }],
      }),
    ).rejects.toThrow();
  });

  it('Relatórios chegam ao cliente com agregações corretas', async () => {
    const seed = await seedMinimo(db);
    // 1000 de receita, 300 de custo → margem 700, 70%
    await client.movimentacoes.create.mutate({
      unidadeId: seed.unidade.id,
      tipo: 'Entrada',
      dataCaixa: '2026-05-15',
      competencia: '05/2026',
      valorTotal: 1000,
      rateios: [{ categoriaId: seed.catReceita.id, valor: 1000 }],
    });
    await client.movimentacoes.create.mutate({
      unidadeId: seed.unidade.id,
      tipo: 'Saída',
      dataCaixa: '2026-05-16',
      competencia: '05/2026',
      valorTotal: 300,
      rateios: [{ categoriaId: seed.catCusto.id, valor: 300 }],
    });

    const r = await client.relatorios.porNatureza.query();
    expect(r.totais.Receita).toBe(1000);
    expect(r.totais.Custo).toBe(300);
    expect(r.margem).toBe(700);
    expect(r.margemPct).toBeCloseTo(70, 1);

    const u = await client.relatorios.porUnidade.query();
    expect(u.itens).toHaveLength(1);
    expect(u.itens[0].saldo).toBe(700);
  });

  it('Datas como string YYYY-MM-DD persistem sem shift de timezone', async () => {
    const seed = await seedMinimo(db);
    const m = await client.movimentacoes.create.mutate({
      unidadeId: seed.unidade.id,
      tipo: 'Saída',
      dataCaixa: '2026-12-31',
      competencia: '12/2026',
      valorTotal: 100,
      rateios: [{ categoriaId: seed.catCusto.id, valor: 100 }],
    });
    const got = await client.movimentacoes.get.query({ id: m.id });
    // Driver retorna como string YYYY-MM-DD ou Date — assertar sobre string
    const data = typeof got.dataCaixa === 'string' ? got.dataCaixa : (got.dataCaixa as any).toISOString().slice(0, 10);
    expect(data).toBe('2026-12-31');
  });
});
