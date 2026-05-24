import { TRPCError } from '@trpc/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { formasPagamento } from '../../drizzle/schema';
import { getDb } from '../db';
import { protectedProcedure, router } from '../_core/trpc';
import { idSchema } from '../helpers/validation';
import { recordAudit } from '../middleware/audit';

const baseInputSchema = z.object({
  nome: z.string().trim().min(1).max(100),
  ativa: z.boolean().optional(),
});

const updateInputSchema = baseInputSchema.partial().extend({ id: idSchema });

export const formasPagRouter = router({
  list: protectedProcedure
    .input(z.object({ incluirInativas: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const where = input?.incluirInativas
        ? isNull(formasPagamento.deletedAt)
        : and(isNull(formasPagamento.deletedAt), eq(formasPagamento.ativa, true));
      return db.select().from(formasPagamento).where(where).orderBy(formasPagamento.nome);
    }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(formasPagamento)
      .where(and(eq(formasPagamento.id, input.id), isNull(formasPagamento.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Forma de pagamento não encontrada.' });
    }
    return rows[0];
  }),

  create: protectedProcedure.input(baseInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const existente = await db
      .select({ id: formasPagamento.id })
      .from(formasPagamento)
      .where(eq(formasPagamento.nome, input.nome))
      .limit(1);
    if (existente.length > 0) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Já existe forma com este nome.' });
    }

    const [result] = await db.insert(formasPagamento).values({
      nome: input.nome,
      ativa: input.ativa ?? true,
      createdBy: ctx.user.id,
    });
    const insertId = (result as any).insertId as number;
    const [created] = await db
      .select()
      .from(formasPagamento)
      .where(eq(formasPagamento.id, insertId))
      .limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'formas_pagamento',
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
      .from(formasPagamento)
      .where(and(eq(formasPagamento.id, id), isNull(formasPagamento.deletedAt)))
      .limit(1);
    if (!antes) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Forma de pagamento não encontrada.' });
    }

    if (patch.nome && patch.nome !== antes.nome) {
      const conflito = await db
        .select({ id: formasPagamento.id })
        .from(formasPagamento)
        .where(eq(formasPagamento.nome, patch.nome))
        .limit(1);
      if (conflito.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe forma com este nome.' });
      }
    }

    await db.update(formasPagamento).set(patch).where(eq(formasPagamento.id, id));
    const [depois] = await db
      .select()
      .from(formasPagamento)
      .where(eq(formasPagamento.id, id))
      .limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'formas_pagamento',
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
        .from(formasPagamento)
        .where(and(eq(formasPagamento.id, input.id), isNull(formasPagamento.deletedAt)))
        .limit(1);
      if (!antes) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Forma de pagamento não encontrada.' });
      }

      await db
        .update(formasPagamento)
        .set({ deletedAt: new Date() })
        .where(eq(formasPagamento.id, input.id));

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'formas_pagamento',
        recordId: input.id,
        acao: 'DELETE',
        antes,
      });
      return { ok: true };
    }),
});
