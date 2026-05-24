import { TRPCError } from '@trpc/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { unidades } from '../../drizzle/schema';
import { getDb } from '../db';
import { protectedProcedure, router } from '../_core/trpc';
import { idSchema } from '../helpers/validation';
import { recordAudit } from '../middleware/audit';

const baseInputSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(255),
  descricao: z.string().trim().max(5000).nullable().optional(),
  ativa: z.boolean().optional(),
});

const updateInputSchema = baseInputSchema.partial().extend({ id: idSchema });

export const unidadesRouter = router({
  list: protectedProcedure
    .input(z.object({ incluirInativas: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      // Semântica: incluirInativas=true mostra TUDO (inclusive soft-deleted e ativa=false).
      // Default mostra só registros vivos e ativos.
      const where = input?.incluirInativas
        ? undefined
        : and(isNull(unidades.deletedAt), eq(unidades.ativa, true));
      return db.select().from(unidades).where(where).orderBy(unidades.nome);
    }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(unidades)
      .where(and(eq(unidades.id, input.id), isNull(unidades.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Unidade não encontrada.' });
    }
    return rows[0];
  }),

  create: protectedProcedure.input(baseInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();

    const existente = await db
      .select({ id: unidades.id })
      .from(unidades)
      .where(and(eq(unidades.nome, input.nome), isNull(unidades.deletedAt)))
      .limit(1);
    if (existente.length > 0) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Já existe unidade com este nome.' });
    }

    const [result] = await db.insert(unidades).values({
      nome: input.nome,
      descricao: input.descricao ?? null,
      ativa: input.ativa ?? true,
      createdBy: ctx.user.id,
    });
    const insertId = (result as any).insertId as number;

    const [created] = await db.select().from(unidades).where(eq(unidades.id, insertId)).limit(1);
    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'unidades',
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
      .from(unidades)
      .where(and(eq(unidades.id, id), isNull(unidades.deletedAt)))
      .limit(1);
    if (!antes) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Unidade não encontrada.' });
    }

    if (patch.nome && patch.nome !== antes.nome) {
      const conflito = await db
        .select({ id: unidades.id })
        .from(unidades)
        .where(and(eq(unidades.nome, patch.nome), isNull(unidades.deletedAt)))
        .limit(1);
      if (conflito.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe unidade com este nome.' });
      }
    }

    await db.update(unidades).set(patch).where(eq(unidades.id, id));
    const [depois] = await db.select().from(unidades).where(eq(unidades.id, id)).limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'unidades',
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
        .from(unidades)
        .where(and(eq(unidades.id, input.id), isNull(unidades.deletedAt)))
        .limit(1);
      if (!antes) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Unidade não encontrada.' });
      }

      await db.update(unidades).set({ deletedAt: new Date() }).where(eq(unidades.id, input.id));

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'unidades',
        recordId: input.id,
        acao: 'DELETE',
        antes,
      });
      return { ok: true };
    }),
});
