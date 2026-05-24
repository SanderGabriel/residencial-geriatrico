import { TRPCError } from '@trpc/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { linhasMargem, movimentacoes, titulos } from '../../drizzle/schema';
import { getDb } from '../db';
import { protectedProcedure, router } from '../_core/trpc';
import { idSchema } from '../helpers/validation';
import { recordAudit } from '../middleware/audit';

const baseInputSchema = z.object({
  nome: z.string().trim().min(1).max(255),
  descricao: z.string().trim().max(5000).nullable().optional(),
  requerNomeCustomizado: z.boolean().optional(),
  ativa: z.boolean().optional(),
});

const updateInputSchema = baseInputSchema.partial().extend({ id: idSchema });

export const linhasMargemRouter = router({
  list: protectedProcedure
    .input(z.object({ incluirInativas: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      // Semântica: incluirInativas=true mostra TUDO (inclusive soft-deleted e ativa=false).
      const where = input?.incluirInativas
        ? undefined
        : and(isNull(linhasMargem.deletedAt), eq(linhasMargem.ativa, true));
      return db.select().from(linhasMargem).where(where).orderBy(linhasMargem.nome);
    }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(linhasMargem)
      .where(and(eq(linhasMargem.id, input.id), isNull(linhasMargem.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Linha de margem não encontrada.' });
    }
    return rows[0];
  }),

  create: protectedProcedure.input(baseInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const existente = await db
      .select({ id: linhasMargem.id })
      .from(linhasMargem)
      .where(and(eq(linhasMargem.nome, input.nome), isNull(linhasMargem.deletedAt)))
      .limit(1);
    if (existente.length > 0) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Já existe linha com este nome.' });
    }

    const [result] = await db.insert(linhasMargem).values({
      nome: input.nome,
      descricao: input.descricao ?? null,
      requerNomeCustomizado: input.requerNomeCustomizado ?? false,
      ativa: input.ativa ?? true,
      createdBy: ctx.user.id,
    });
    const insertId = (result as any).insertId as number;
    const [created] = await db
      .select()
      .from(linhasMargem)
      .where(eq(linhasMargem.id, insertId))
      .limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'linhas_margem',
      recordId: insertId,
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
      .from(linhasMargem)
      .where(and(eq(linhasMargem.id, id), isNull(linhasMargem.deletedAt)))
      .limit(1);
    if (!antes) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Linha de margem não encontrada.' });
    }

    if (patch.nome && patch.nome !== antes.nome) {
      const conflito = await db
        .select({ id: linhasMargem.id })
        .from(linhasMargem)
        .where(and(eq(linhasMargem.nome, patch.nome), isNull(linhasMargem.deletedAt)))
        .limit(1);
      if (conflito.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe linha com este nome.' });
      }
    }

    await db.update(linhasMargem).set(patch).where(eq(linhasMargem.id, id));
    const [depois] = await db
      .select()
      .from(linhasMargem)
      .where(eq(linhasMargem.id, id))
      .limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'linhas_margem',
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
        .from(linhasMargem)
        .where(and(eq(linhasMargem.id, input.id), isNull(linhasMargem.deletedAt)))
        .limit(1);
      if (!antes) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Linha de margem não encontrada.' });
      }

      // Regra: não deletar se há movimentações ou títulos vinculados.
      const [{ countMov }] = await db
        .select({ countMov: sql<number>`COUNT(*)` })
        .from(movimentacoes)
        .where(
          and(eq(movimentacoes.linhaMargemId, input.id), isNull(movimentacoes.deletedAt)),
        );
      const [{ countTit }] = await db
        .select({ countTit: sql<number>`COUNT(*)` })
        .from(titulos)
        .where(and(eq(titulos.linhaMargemId, input.id), isNull(titulos.deletedAt)));
      const total = Number(countMov) + Number(countTit);
      if (total > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Linha vinculada a ${countMov} movimentação(ões) e ${countTit} título(s). Desative em vez de excluir.`,
        });
      }

      await db
        .update(linhasMargem)
        .set({ deletedAt: new Date() })
        .where(eq(linhasMargem.id, input.id));

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'linhas_margem',
        recordId: input.id,
        acao: 'DELETE',
        antes,
      });
      return { ok: true };
    }),
});
