import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  categorias,
  linhasMargem,
  movimentacoes,
  rateios,
  unidades,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { protectedProcedure, router } from '../_core/trpc';
import { competenciaSchema, dateStringSchema, idSchema } from '../helpers/validation';

const periodoSchema = z
  .object({
    periodoInicio: dateStringSchema.optional(),
    periodoFim: dateStringSchema.optional(),
    competencia: competenciaSchema.optional(),
    unidadeId: idSchema.optional(),
  })
  .optional();

export const relatoriosRouter = router({
  /**
   * Resumo por natureza: soma de movimentações agrupadas pela natureza da
   * categoria do rateio. Retorna receita, custo, despesa, etc + margem (receita-custo).
   */
  porNatureza: protectedProcedure.input(periodoSchema).query(async ({ input }) => {
    const db = getDb();
    const conds = [isNull(movimentacoes.deletedAt)];
    if (input?.periodoInicio) conds.push(gte(movimentacoes.dataCaixa, input.periodoInicio));
    if (input?.periodoFim) conds.push(lte(movimentacoes.dataCaixa, input.periodoFim));
    if (input?.competencia) conds.push(eq(movimentacoes.competencia, input.competencia));
    if (input?.unidadeId) conds.push(eq(movimentacoes.unidadeId, input.unidadeId));

    const rows = await db
      .select({
        natureza: categorias.natureza,
        total: sql<string>`SUM(${rateios.valorLiquidoFinal})`,
        qtdRateios: sql<number>`COUNT(*)`,
      })
      .from(rateios)
      .innerJoin(movimentacoes, eq(rateios.movimentacaoId, movimentacoes.id))
      .innerJoin(categorias, eq(rateios.categoriaId, categorias.id))
      .where(and(...conds))
      .groupBy(categorias.natureza);

    const totais: Record<string, number> = {
      Receita: 0,
      Custo: 0,
      Despesa: 0,
      Imposto: 0,
      Investimento: 0,
      'Não Operacional': 0,
    };
    for (const r of rows) totais[r.natureza] = Number(r.total) || 0;

    const margem = totais['Receita'] - totais['Custo'];
    const margemPct = totais['Receita'] > 0 ? (margem / totais['Receita']) * 100 : 0;

    return {
      totais,
      margem,
      margemPct,
      detalhe: rows.map((r) => ({
        natureza: r.natureza,
        total: Number(r.total) || 0,
        qtdRateios: Number(r.qtdRateios),
      })),
    };
  }),

  /**
   * Resumo por linha de margem: soma de movimentações agrupadas pela
   * linha_margem_id da movimentação. Mostra contribuição de cada produto/serviço
   * (Fraldas, Oxigênio, etc.).
   */
  porLinhaMargem: protectedProcedure.input(periodoSchema).query(async ({ input }) => {
    const db = getDb();
    const conds = [isNull(movimentacoes.deletedAt)];
    if (input?.periodoInicio) conds.push(gte(movimentacoes.dataCaixa, input.periodoInicio));
    if (input?.periodoFim) conds.push(lte(movimentacoes.dataCaixa, input.periodoFim));
    if (input?.competencia) conds.push(eq(movimentacoes.competencia, input.competencia));
    if (input?.unidadeId) conds.push(eq(movimentacoes.unidadeId, input.unidadeId));

    // Soma valor_liquido agrupado por linha e tipo (Entrada/Saída).
    const rows = await db
      .select({
        linhaId: movimentacoes.linhaMargemId,
        linhaNome: linhasMargem.nome,
        tipo: movimentacoes.tipo,
        total: sql<string>`SUM(${movimentacoes.valorLiquido})`,
      })
      .from(movimentacoes)
      .leftJoin(linhasMargem, eq(movimentacoes.linhaMargemId, linhasMargem.id))
      .where(and(...conds))
      .groupBy(movimentacoes.linhaMargemId, linhasMargem.nome, movimentacoes.tipo);

    // Pivota: cada linha com {entrada, saida, margem}
    const mapa = new Map<string, { id: number | null; nome: string; entrada: number; saida: number }>();
    for (const r of rows) {
      const key = String(r.linhaId ?? 'null');
      if (!mapa.has(key)) {
        mapa.set(key, {
          id: r.linhaId,
          nome: r.linhaNome ?? '(Sem linha)',
          entrada: 0,
          saida: 0,
        });
      }
      const acc = mapa.get(key)!;
      if (r.tipo === 'Entrada') acc.entrada = Number(r.total) || 0;
      else acc.saida = Number(r.total) || 0;
    }

    const itens = Array.from(mapa.values()).map((x) => ({
      linhaId: x.id,
      linhaNome: x.nome,
      entrada: x.entrada,
      saida: x.saida,
      margem: x.entrada - x.saida,
      margemPct: x.entrada > 0 ? ((x.entrada - x.saida) / x.entrada) * 100 : 0,
    }));
    itens.sort((a, b) => b.margem - a.margem);
    return { itens };
  }),

  /**
   * Resumo por unidade: receita - despesa por casa.
   */
  porUnidade: protectedProcedure.input(periodoSchema).query(async ({ input }) => {
    const db = getDb();
    const conds = [isNull(movimentacoes.deletedAt)];
    if (input?.periodoInicio) conds.push(gte(movimentacoes.dataCaixa, input.periodoInicio));
    if (input?.periodoFim) conds.push(lte(movimentacoes.dataCaixa, input.periodoFim));
    if (input?.competencia) conds.push(eq(movimentacoes.competencia, input.competencia));

    const rows = await db
      .select({
        unidadeId: movimentacoes.unidadeId,
        unidadeNome: unidades.nome,
        tipo: movimentacoes.tipo,
        total: sql<string>`SUM(${movimentacoes.valorLiquido})`,
      })
      .from(movimentacoes)
      .innerJoin(unidades, eq(movimentacoes.unidadeId, unidades.id))
      .where(and(...conds))
      .groupBy(movimentacoes.unidadeId, unidades.nome, movimentacoes.tipo);

    const mapa = new Map<number, { id: number; nome: string; entrada: number; saida: number }>();
    for (const r of rows) {
      if (!mapa.has(r.unidadeId)) {
        mapa.set(r.unidadeId, { id: r.unidadeId, nome: r.unidadeNome, entrada: 0, saida: 0 });
      }
      const acc = mapa.get(r.unidadeId)!;
      if (r.tipo === 'Entrada') acc.entrada = Number(r.total) || 0;
      else acc.saida = Number(r.total) || 0;
    }

    const itens = Array.from(mapa.values()).map((x) => ({
      unidadeId: x.id,
      unidadeNome: x.nome,
      entrada: x.entrada,
      saida: x.saida,
      saldo: x.entrada - x.saida,
    }));
    itens.sort((a, b) => b.saldo - a.saldo);
    return { itens };
  }),
});
