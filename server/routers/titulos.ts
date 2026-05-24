import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { z } from 'zod';
import { movimentacoes, rateios, titulos } from '../../drizzle/schema';
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
import { arredondar, calcularValorLiquido } from '../helpers/rateios';
import { recordAudit } from '../middleware/audit';

const tipoSchema = z.enum(['Pagar', 'Receber']);
const statusSchema = z.enum(['Previsto', 'Parcial', 'Pago', 'Recebido', 'Atrasado', 'Cancelado']);

const createInputSchema = z.object({
  unidadeId: idSchema,
  tipo: tipoSchema,
  fornecedorId: idSchema.nullable().optional(),
  residenteId: idSchema.nullable().optional(),
  descricao: z.string().trim().min(1).max(255),
  valorTotal: decimalPosSchema,
  desconto: decimalNonNegSchema.default(0),
  dataVencimento: dateStringSchema,
  competencia: competenciaSchema.optional(),
  linhaMargemId: idSchema.nullable().optional(),
  linhaMargemOtherName: z.string().trim().max(255).nullable().optional(),
});

const updateInputSchema = z.object({
  id: idSchema,
  descricao: z.string().trim().min(1).max(255).optional(),
  valorTotal: decimalPosSchema.optional(),
  desconto: decimalNonNegSchema.optional(),
  dataVencimento: dateStringSchema.optional(),
  competencia: competenciaSchema.nullable().optional(),
  fornecedorId: idSchema.nullable().optional(),
  residenteId: idSchema.nullable().optional(),
  linhaMargemId: idSchema.nullable().optional(),
  linhaMargemOtherName: z.string().trim().max(255).nullable().optional(),
  status: statusSchema.optional(),
});

const listInputSchema = z
  .object({
    tipo: tipoSchema.optional(),
    status: statusSchema.optional(),
    unidadeId: idSchema.optional(),
    vencimentoInicio: dateStringSchema.optional(),
    vencimentoFim: dateStringSchema.optional(),
    pagination: paginationSchema.optional(),
  })
  .optional();

/** Decide o próximo status do título com base no saldo restante. */
function proximoStatus(
  tipo: 'Pagar' | 'Receber',
  saldoEmAberto: number,
  statusAtual: 'Previsto' | 'Parcial' | 'Pago' | 'Recebido' | 'Atrasado' | 'Cancelado',
): 'Previsto' | 'Parcial' | 'Pago' | 'Recebido' | 'Atrasado' | 'Cancelado' {
  if (statusAtual === 'Cancelado') return 'Cancelado';
  if (saldoEmAberto <= 0.005) {
    return tipo === 'Pagar' ? 'Pago' : 'Recebido';
  }
  return 'Parcial';
}

export const titulosRouter = router({
  list: protectedProcedure.input(listInputSchema).query(async ({ input }) => {
    const db = getDb();
    const f = input ?? {};
    const conds = [isNull(titulos.deletedAt)];
    if (f.tipo) conds.push(eq(titulos.tipo, f.tipo));
    if (f.status) conds.push(eq(titulos.status, f.status));
    if (f.unidadeId) conds.push(eq(titulos.unidadeId, f.unidadeId));
    if (f.vencimentoInicio) conds.push(gte(titulos.dataVencimento, f.vencimentoInicio));
    if (f.vencimentoFim) conds.push(lte(titulos.dataVencimento, f.vencimentoFim));

    const pag = f.pagination ?? { page: 1, pageSize: 50 };
    const items = await db
      .select()
      .from(titulos)
      .where(and(...conds))
      .orderBy(desc(titulos.dataVencimento), desc(titulos.id))
      .limit(pag.pageSize)
      .offset((pag.page - 1) * pag.pageSize);
    return { items, page: pag.page, pageSize: pag.pageSize };
  }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const [t] = await db
      .select()
      .from(titulos)
      .where(and(eq(titulos.id, input.id), isNull(titulos.deletedAt)))
      .limit(1);
    if (!t) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado.' });

    const pagamentos = await db
      .select()
      .from(movimentacoes)
      .where(and(eq(movimentacoes.tituloId, input.id), isNull(movimentacoes.deletedAt)))
      .orderBy(desc(movimentacoes.dataCaixa));

    return { ...t, pagamentos };
  }),

  create: protectedProcedure.input(createInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const saldoInicial = arredondar(input.valorTotal - input.desconto);

    const [result] = await db.insert(titulos).values({
      unidadeId: input.unidadeId,
      tipo: input.tipo,
      fornecedorId: input.fornecedorId ?? null,
      residenteId: input.residenteId ?? null,
      descricao: input.descricao,
      valorTotal: input.valorTotal.toFixed(2),
      desconto: input.desconto.toFixed(2),
      dataVencimento: input.dataVencimento,
      competencia: input.competencia ?? null,
      saldoEmAberto: saldoInicial.toFixed(2),
      valorRecebidoAcumulado: '0.00',
      status: 'Previsto',
      linhaMargemId: input.linhaMargemId ?? null,
      linhaMargemOtherName: input.linhaMargemOtherName ?? null,
      createdBy: ctx.user.id,
    });
    const id = (result as any).insertId as number;
    const [created] = await db.select().from(titulos).where(eq(titulos.id, id)).limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'titulos',
      recordId: id,
      acao: 'CREATE',
      depois: created,
    });

    return created;
  }),

  update: protectedProcedure.input(updateInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const { id, ...patch } = input;

    const [antes] = await db
      .select()
      .from(titulos)
      .where(and(eq(titulos.id, id), isNull(titulos.deletedAt)))
      .limit(1);
    if (!antes) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado.' });

    const setObj: Record<string, unknown> = {};
    if (patch.descricao !== undefined) setObj.descricao = patch.descricao;
    if (patch.valorTotal !== undefined) setObj.valorTotal = patch.valorTotal.toFixed(2);
    if (patch.desconto !== undefined) setObj.desconto = patch.desconto.toFixed(2);
    if (patch.dataVencimento !== undefined) setObj.dataVencimento = patch.dataVencimento;
    if (patch.competencia !== undefined) setObj.competencia = patch.competencia;
    if (patch.fornecedorId !== undefined) setObj.fornecedorId = patch.fornecedorId;
    if (patch.residenteId !== undefined) setObj.residenteId = patch.residenteId;
    if (patch.linhaMargemId !== undefined) setObj.linhaMargemId = patch.linhaMargemId;
    if (patch.linhaMargemOtherName !== undefined)
      setObj.linhaMargemOtherName = patch.linhaMargemOtherName;
    if (patch.status !== undefined) setObj.status = patch.status;

    // Se alteraram valor/desconto, recalcula saldo (mantendo valorRecebidoAcumulado).
    if (patch.valorTotal !== undefined || patch.desconto !== undefined) {
      const novoValor = patch.valorTotal ?? Number(antes.valorTotal);
      const novoDesc = patch.desconto ?? Number(antes.desconto);
      const acumulado = Number(antes.valorRecebidoAcumulado);
      const novoSaldo = arredondar(novoValor - novoDesc - acumulado);
      setObj.saldoEmAberto = novoSaldo.toFixed(2);
      setObj.status = proximoStatus(antes.tipo, novoSaldo, antes.status);
    }

    if (Object.keys(setObj).length > 0) {
      await db.update(titulos).set(setObj).where(eq(titulos.id, id));
    }
    const [depois] = await db.select().from(titulos).where(eq(titulos.id, id)).limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'titulos',
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
        .from(titulos)
        .where(and(eq(titulos.id, input.id), isNull(titulos.deletedAt)))
        .limit(1);
      if (!antes) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado.' });

      await db.update(titulos).set({ deletedAt: new Date() }).where(eq(titulos.id, input.id));

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'titulos',
        recordId: input.id,
        acao: 'DELETE',
        antes,
      });
      return { ok: true };
    }),

  /**
   * Pagar (ou receber) total/parcialmente um título.
   * - Valida valor > 0 e ≤ saldoEmAberto
   * - Cria uma movimentação (Saída se Pagar, Entrada se Receber) com 1 rateio na
   *   categoria informada, herda linhaMargemId do título
   * - Atualiza valorRecebidoAcumulado e saldoEmAberto do título
   * - Atualiza status do título conforme proximoStatus()
   */
  pagar: protectedProcedure
    .input(
      z.object({
        tituloId: idSchema,
        valorPagamento: decimalPosSchema,
        dataCaixa: dateStringSchema,
        competencia: competenciaSchema,
        formaPagamentoId: idSchema.nullable().optional(),
        categoriaId: idSchema,
        descricao: z.string().trim().max(5000).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [titulo] = await db
        .select()
        .from(titulos)
        .where(and(eq(titulos.id, input.tituloId), isNull(titulos.deletedAt)))
        .limit(1);
      if (!titulo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado.' });
      }
      if (titulo.status === 'Cancelado') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Título está cancelado.',
        });
      }
      const saldo = Number(titulo.saldoEmAberto);
      if (input.valorPagamento - saldo > 0.01) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Valor (${input.valorPagamento.toFixed(2)}) maior que saldo em aberto (${saldo.toFixed(2)}).`,
        });
      }

      const movTipo: 'Entrada' | 'Saída' = titulo.tipo === 'Pagar' ? 'Saída' : 'Entrada';
      const novoAcumulado = arredondar(Number(titulo.valorRecebidoAcumulado) + input.valorPagamento);
      const novoSaldo = arredondar(saldo - input.valorPagamento);
      const novoStatus = proximoStatus(titulo.tipo, novoSaldo, titulo.status);
      const valorLiquido = calcularValorLiquido(input.valorPagamento, 0, 0);

      const movId = await db.transaction(async (tx) => {
        const [movResult] = await tx.insert(movimentacoes).values({
          unidadeId: titulo.unidadeId,
          tipo: movTipo,
          dataCaixa: input.dataCaixa,
          competencia: input.competencia,
          valorTotal: input.valorPagamento.toFixed(2),
          desconto: '0.00',
          frete: '0.00',
          valorLiquido: valorLiquido.toFixed(2),
          formaPagamentoId: input.formaPagamentoId ?? null,
          fornecedorId: titulo.fornecedorId,
          descricao: input.descricao ?? `Pagamento de título #${titulo.id} — ${titulo.descricao}`,
          linhaMargemId: titulo.linhaMargemId,
          linhaMargemOtherName: titulo.linhaMargemOtherName,
          tituloId: titulo.id,
          createdBy: ctx.user.id,
        });
        const newMovId = (movResult as any).insertId as number;

        await tx.insert(rateios).values({
          movimentacaoId: newMovId,
          categoriaId: input.categoriaId,
          valorBruto: input.valorPagamento.toFixed(2),
          descontoRateado: '0.00',
          freteRateado: '0.00',
          valorLiquidoFinal: input.valorPagamento.toFixed(2),
        });

        await tx
          .update(titulos)
          .set({
            valorRecebidoAcumulado: novoAcumulado.toFixed(2),
            saldoEmAberto: novoSaldo.toFixed(2),
            status: novoStatus,
          })
          .where(eq(titulos.id, titulo.id));

        return newMovId;
      });

      const [tituloAtualizado] = await db
        .select()
        .from(titulos)
        .where(eq(titulos.id, titulo.id))
        .limit(1);

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'titulos',
        recordId: titulo.id,
        acao: 'UPDATE',
        antes: titulo,
        depois: tituloAtualizado,
      });

      return { titulo: tituloAtualizado, movimentacaoId: movId };
    }),
});
