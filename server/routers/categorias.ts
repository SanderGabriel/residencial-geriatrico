import { TRPCError } from '@trpc/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { categorias, rateios } from '../../drizzle/schema';
import { getDb } from '../db';
import { protectedProcedure, router } from '../_core/trpc';
import { idSchema } from '../helpers/validation';
import { recordAudit } from '../middleware/audit';

const naturezaSchema = z.enum([
  'Receita',
  'Custo',
  'Despesa',
  'Imposto',
  'Investimento',
  'Não Operacional',
]);

const baseInputSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(255),
  grupo: z.string().trim().min(1, 'Grupo obrigatório').max(100),
  natureza: naturezaSchema,
  ativa: z.boolean().optional(),
});

const updateInputSchema = baseInputSchema.partial().extend({ id: idSchema });

export const categoriasRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          grupo: z.string().optional(),
          natureza: naturezaSchema.optional(),
          incluirInativas: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      // Semântica: incluirInativas=true mostra TUDO (inclusive soft-deleted e ativa=false).
      const conds = [] as any[];
      if (!input?.incluirInativas) {
        conds.push(isNull(categorias.deletedAt));
        conds.push(eq(categorias.ativa, true));
      }
      if (input?.grupo) conds.push(eq(categorias.grupo, input.grupo));
      if (input?.natureza) conds.push(eq(categorias.natureza, input.natureza));
      return db
        .select()
        .from(categorias)
        .where(conds.length > 0 ? and(...conds) : undefined)
        .orderBy(categorias.grupo, categorias.nome);
    }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(categorias)
      .where(and(eq(categorias.id, input.id), isNull(categorias.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Categoria não encontrada.' });
    }
    return rows[0];
  }),

  create: protectedProcedure.input(baseInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();

    const existente = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(and(eq(categorias.nome, input.nome), isNull(categorias.deletedAt)))
      .limit(1);
    if (existente.length > 0) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Já existe categoria com este nome.' });
    }

    const [result] = await db.insert(categorias).values({
      nome: input.nome,
      grupo: input.grupo,
      natureza: input.natureza,
      ativa: input.ativa ?? true,
      createdBy: ctx.user.id,
    });
    const insertId = (result as any).insertId as number;
    const [created] = await db
      .select()
      .from(categorias)
      .where(eq(categorias.id, insertId))
      .limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'categorias',
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
      .from(categorias)
      .where(and(eq(categorias.id, id), isNull(categorias.deletedAt)))
      .limit(1);
    if (!antes) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Categoria não encontrada.' });
    }

    if (patch.nome && patch.nome !== antes.nome) {
      const conflito = await db
        .select({ id: categorias.id })
        .from(categorias)
        .where(and(eq(categorias.nome, patch.nome), isNull(categorias.deletedAt)))
        .limit(1);
      if (conflito.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe categoria com este nome.' });
      }
    }

    await db.update(categorias).set(patch).where(eq(categorias.id, id));
    const [depois] = await db.select().from(categorias).where(eq(categorias.id, id)).limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'categorias',
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
        .from(categorias)
        .where(and(eq(categorias.id, input.id), isNull(categorias.deletedAt)))
        .limit(1);
      if (!antes) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Categoria não encontrada.' });
      }

      // Regra: não deletar se há rateios vinculados.
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(rateios)
        .where(eq(rateios.categoriaId, input.id));
      if (Number(count) > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Categoria está vinculada a ${count} rateio(s). Desative em vez de excluir.`,
        });
      }

      await db
        .update(categorias)
        .set({ deletedAt: new Date() })
        .where(eq(categorias.id, input.id));

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'categorias',
        recordId: input.id,
        acao: 'DELETE',
        antes,
      });
      return { ok: true };
    }),
});
