import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, isNull, lte, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  movimentacoes,
  rateios,
  categorias,
  unidades,
  formasPagamento,
  fornecedores,
  linhasMargem,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { protectedProcedure, router } from '../_core/trpc';
import {
  competenciaSchema,
  dateStringSchema,
  decimalNonNegSchema,
  decimalPosSchema,
  idSchema,
  paginationSchema,
} from '../helpers/validation';
import {
  calcularRateiosComDesconto,
  calcularValorLiquido,
  type RateioCalculado,
} from '../helpers/rateios';
import { recordAudit } from '../middleware/audit';

const tipoSchema = z.enum(['Entrada', 'Saída']);

const rateioInputSchema = z.object({
  categoriaId: idSchema,
  valor: decimalPosSchema,
});

const createInputSchema = z
  .object({
    unidadeId: idSchema,
    tipo: tipoSchema,
    dataCaixa: dateStringSchema,
    competencia: competenciaSchema,
    valorTotal: decimalPosSchema,
    desconto: decimalNonNegSchema.default(0),
    frete: decimalNonNegSchema.default(0),
    formaPagamentoId: idSchema.nullable().optional(),
    fornecedorId: idSchema.nullable().optional(),
    pagador: z.string().trim().max(255).nullable().optional(),
    beneficiario: z.string().trim().max(255).nullable().optional(),
    descricao: z.string().trim().max(5000).nullable().optional(),
    linhaMargemId: idSchema.nullable().optional(),
    linhaMargemOtherName: z.string().trim().max(255).nullable().optional(),
    tituloId: idSchema.nullable().optional(),
    rateios: z.array(rateioInputSchema).min(1, 'Inclua ao menos 1 rateio'),
  })
  .refine(
    (v) => {
      const soma = v.rateios.reduce((a, r) => a + r.valor, 0);
      return Math.abs(soma - v.valorTotal) <= 0.01;
    },
    { message: 'Soma dos rateios deve ser igual ao valor_total (tolerância R$ 0,01)', path: ['rateios'] },
  );

const updateInputSchema = z.object({
  id: idSchema,
  dataCaixa: dateStringSchema.optional(),
  competencia: competenciaSchema.optional(),
  valorTotal: decimalPosSchema.optional(),
  desconto: decimalNonNegSchema.optional(),
  frete: decimalNonNegSchema.optional(),
  formaPagamentoId: idSchema.nullable().optional(),
  fornecedorId: idSchema.nullable().optional(),
  pagador: z.string().trim().max(255).nullable().optional(),
  beneficiario: z.string().trim().max(255).nullable().optional(),
  descricao: z.string().trim().max(5000).nullable().optional(),
  linhaMargemId: idSchema.nullable().optional(),
  linhaMargemOtherName: z.string().trim().max(255).nullable().optional(),
  rateios: z.array(rateioInputSchema).min(1).optional(),
});

const listInputSchema = z
  .object({
    periodoInicio: dateStringSchema.optional(),
    periodoFim: dateStringSchema.optional(),
    tipo: tipoSchema.optional(),
    unidadeId: idSchema.optional(),
    fornecedorId: idSchema.optional(),
    formaPagamentoId: idSchema.optional(),
    competencia: competenciaSchema.optional(),
    beneficiario: z.string().trim().min(1).optional(),
    categoriaId: idSchema.optional(),
    pagination: paginationSchema.optional(),
  })
  .optional();

export const movimentacoesRouter = router({
  list: protectedProcedure.input(listInputSchema).query(async ({ input }) => {
    const db = getDb();
    const f = input ?? {};
    const conds = [isNull(movimentacoes.deletedAt)];
    if (f.periodoInicio) conds.push(gte(movimentacoes.dataCaixa, f.periodoInicio));
    if (f.periodoFim) conds.push(lte(movimentacoes.dataCaixa, f.periodoFim));
    if (f.tipo) conds.push(eq(movimentacoes.tipo, f.tipo));
    if (f.unidadeId) conds.push(eq(movimentacoes.unidadeId, f.unidadeId));
    if (f.fornecedorId) conds.push(eq(movimentacoes.fornecedorId, f.fornecedorId));
    if (f.formaPagamentoId) conds.push(eq(movimentacoes.formaPagamentoId, f.formaPagamentoId));
    if (f.competencia) conds.push(eq(movimentacoes.competencia, f.competencia));
    if (f.beneficiario) conds.push(like(movimentacoes.beneficiario, `%${f.beneficiario}%`));

    const where = and(...conds);
    const pag = f.pagination ?? { page: 1, pageSize: 50 };

    // Se filtrar por categoria, faz INNER JOIN com rateios.
    if (f.categoriaId) {
      const rows = await db
        .selectDistinct({ mov: movimentacoes })
        .from(movimentacoes)
        .innerJoin(rateios, eq(rateios.movimentacaoId, movimentacoes.id))
        .where(and(where, eq(rateios.categoriaId, f.categoriaId)))
        .orderBy(desc(movimentacoes.dataCaixa), desc(movimentacoes.id))
        .limit(pag.pageSize)
        .offset((pag.page - 1) * pag.pageSize);
      return { items: rows.map((r) => r.mov), page: pag.page, pageSize: pag.pageSize };
    }

    const items = await db
      .select()
      .from(movimentacoes)
      .where(where)
      .orderBy(desc(movimentacoes.dataCaixa), desc(movimentacoes.id))
      .limit(pag.pageSize)
      .offset((pag.page - 1) * pag.pageSize);

    return { items, page: pag.page, pageSize: pag.pageSize };
  }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const [mov] = await db
      .select()
      .from(movimentacoes)
      .where(and(eq(movimentacoes.id, input.id), isNull(movimentacoes.deletedAt)))
      .limit(1);
    if (!mov) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Movimentação não encontrada.' });
    }
    const rateiosList = await db
      .select({
        id: rateios.id,
        movimentacaoId: rateios.movimentacaoId,
        categoriaId: rateios.categoriaId,
        valorBruto: rateios.valorBruto,
        descontoRateado: rateios.descontoRateado,
        freteRateado: rateios.freteRateado,
        valorLiquidoFinal: rateios.valorLiquidoFinal,
        categoriaNome: categorias.nome,
      })
      .from(rateios)
      .leftJoin(categorias, eq(rateios.categoriaId, categorias.id))
      .where(eq(rateios.movimentacaoId, input.id));
    return { ...mov, rateios: rateiosList };
  }),

  create: protectedProcedure.input(createInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();

    // Valida que a unidade existe.
    const [unidade] = await db
      .select({ id: unidades.id })
      .from(unidades)
      .where(and(eq(unidades.id, input.unidadeId), isNull(unidades.deletedAt)))
      .limit(1);
    if (!unidade) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unidade inválida.' });
    }

    // Calcula rateios proporcionais
    const rateiosCalculados = calcularRateiosComDesconto({
      valorTotal: input.valorTotal,
      desconto: input.desconto,
      frete: input.frete,
      rateios: input.rateios.map((r) => ({ categoriaId: r.categoriaId, valorBruto: r.valor })),
    });

    const valorLiquido = calcularValorLiquido(input.valorTotal, input.desconto, input.frete);

    const movId = await db.transaction(async (tx) => {
      const [result] = await tx.insert(movimentacoes).values({
        unidadeId: input.unidadeId,
        tipo: input.tipo,
        dataCaixa: input.dataCaixa,
        competencia: input.competencia,
        valorTotal: input.valorTotal.toFixed(2),
        desconto: input.desconto.toFixed(2),
        frete: input.frete.toFixed(2),
        valorLiquido: valorLiquido.toFixed(2),
        formaPagamentoId: input.formaPagamentoId ?? null,
        fornecedorId: input.fornecedorId ?? null,
        pagador: input.pagador ?? null,
        beneficiario: input.beneficiario ?? null,
        descricao: input.descricao ?? null,
        linhaMargemId: input.linhaMargemId ?? null,
        linhaMargemOtherName: input.linhaMargemOtherName ?? null,
        tituloId: input.tituloId ?? null,
        createdBy: ctx.user.id,
      });
      const id = (result as any).insertId as number;

      await tx.insert(rateios).values(
        rateiosCalculados.map((r) => ({
          movimentacaoId: id,
          categoriaId: r.categoriaId,
          valorBruto: r.valorBruto.toFixed(2),
          descontoRateado: r.descontoRateado.toFixed(2),
          freteRateado: r.freteRateado.toFixed(2),
          valorLiquidoFinal: r.valorLiquidoFinal.toFixed(2),
        })),
      );

      return id;
    });

    const [created] = await db
      .select()
      .from(movimentacoes)
      .where(eq(movimentacoes.id, movId))
      .limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'movimentacoes',
      recordId: movId,
      acao: 'CREATE',
      depois: { ...created, rateios: rateiosCalculados },
    });

    return { id: movId };
  }),

  update: protectedProcedure.input(updateInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const { id, rateios: novosRateios, ...patch } = input;

    const [antes] = await db
      .select()
      .from(movimentacoes)
      .where(and(eq(movimentacoes.id, id), isNull(movimentacoes.deletedAt)))
      .limit(1);
    if (!antes) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Movimentação não encontrada.' });
    }

    // Resolve campos finais (patch sobrescreve antes).
    const valorTotal = patch.valorTotal ?? Number(antes.valorTotal);
    const desconto = patch.desconto ?? Number(antes.desconto);
    const frete = patch.frete ?? Number(antes.frete);
    const valorLiquido = calcularValorLiquido(valorTotal, desconto, frete);

    // Se rateios novos ou valor/desconto/frete mudaram, recalcula.
    const precisaRecalcular =
      novosRateios !== undefined ||
      patch.valorTotal !== undefined ||
      patch.desconto !== undefined ||
      patch.frete !== undefined;

    let rateiosCalc: RateioCalculado[] | undefined;
    if (precisaRecalcular) {
      const ratesInput = novosRateios
        ? novosRateios.map((r) => ({ categoriaId: r.categoriaId, valorBruto: r.valor }))
        : (
            await db
              .select({ categoriaId: rateios.categoriaId, valorBruto: rateios.valorBruto })
              .from(rateios)
              .where(eq(rateios.movimentacaoId, id))
          ).map((r) => ({ categoriaId: r.categoriaId, valorBruto: Number(r.valorBruto) }));

      rateiosCalc = calcularRateiosComDesconto({
        valorTotal,
        desconto,
        frete,
        rateios: ratesInput,
      });
    }

    await db.transaction(async (tx) => {
      const setObj: Record<string, unknown> = {};
      if (patch.dataCaixa !== undefined) setObj.dataCaixa = patch.dataCaixa;
      if (patch.competencia !== undefined) setObj.competencia = patch.competencia;
      if (patch.valorTotal !== undefined) setObj.valorTotal = patch.valorTotal.toFixed(2);
      if (patch.desconto !== undefined) setObj.desconto = patch.desconto.toFixed(2);
      if (patch.frete !== undefined) setObj.frete = patch.frete.toFixed(2);
      if (precisaRecalcular) setObj.valorLiquido = valorLiquido.toFixed(2);
      if (patch.formaPagamentoId !== undefined) setObj.formaPagamentoId = patch.formaPagamentoId;
      if (patch.fornecedorId !== undefined) setObj.fornecedorId = patch.fornecedorId;
      if (patch.pagador !== undefined) setObj.pagador = patch.pagador;
      if (patch.beneficiario !== undefined) setObj.beneficiario = patch.beneficiario;
      if (patch.descricao !== undefined) setObj.descricao = patch.descricao;
      if (patch.linhaMargemId !== undefined) setObj.linhaMargemId = patch.linhaMargemId;
      if (patch.linhaMargemOtherName !== undefined)
        setObj.linhaMargemOtherName = patch.linhaMargemOtherName;

      if (Object.keys(setObj).length > 0) {
        await tx.update(movimentacoes).set(setObj).where(eq(movimentacoes.id, id));
      }

      if (rateiosCalc) {
        await tx.delete(rateios).where(eq(rateios.movimentacaoId, id));
        await tx.insert(rateios).values(
          rateiosCalc.map((r) => ({
            movimentacaoId: id,
            categoriaId: r.categoriaId,
            valorBruto: r.valorBruto.toFixed(2),
            descontoRateado: r.descontoRateado.toFixed(2),
            freteRateado: r.freteRateado.toFixed(2),
            valorLiquidoFinal: r.valorLiquidoFinal.toFixed(2),
          })),
        );
      }
    });

    const [depois] = await db.select().from(movimentacoes).where(eq(movimentacoes.id, id)).limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'movimentacoes',
      recordId: id,
      acao: 'UPDATE',
      antes,
      depois,
    });

    return depois;
  }),

  delete: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [antes] = await db
        .select()
        .from(movimentacoes)
        .where(and(eq(movimentacoes.id, input.id), isNull(movimentacoes.deletedAt)))
        .limit(1);
      if (!antes) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Movimentação não encontrada.' });
      }

      await db
        .update(movimentacoes)
        .set({ deletedAt: new Date() })
        .where(eq(movimentacoes.id, input.id));

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'movimentacoes',
        recordId: input.id,
        acao: 'DELETE',
        antes,
      });
      return { ok: true };
    }),
});

// Re-exports usados no router de relatório, etc. (placeholder p/ Parte 3)
export { unidades, formasPagamento, fornecedores, linhasMargem, sql };
