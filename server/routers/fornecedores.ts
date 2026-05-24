import { TRPCError } from '@trpc/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { fornecedores } from '../../drizzle/schema';
import { getDb } from '../db';
import { protectedProcedure, router } from '../_core/trpc';
import { idSchema } from '../helpers/validation';
import { recordAudit } from '../middleware/audit';

const baseInputSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(255),
  documento: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, '') : v))
    .refine((v) => !v || v.length === 11 || v.length === 14, {
      message: 'Documento deve ser CPF (11) ou CNPJ (14)',
    }),
  telefone: z.string().trim().max(20).optional(),
  email: z.string().trim().email('Email inválido').max(255).optional().or(z.literal('')),
  ativa: z.boolean().optional(),
});

const updateInputSchema = baseInputSchema.partial().extend({ id: idSchema });

export const fornecedoresRouter = router({
  list: protectedProcedure
    .input(z.object({ incluirInativos: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      // Semântica: incluirInativos=true mostra TUDO (inclusive soft-deleted e ativa=false).
      const where = input?.incluirInativos
        ? undefined
        : and(isNull(fornecedores.deletedAt), eq(fornecedores.ativa, true));
      return db.select().from(fornecedores).where(where).orderBy(fornecedores.nome);
    }),

  get: protectedProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(fornecedores)
      .where(and(eq(fornecedores.id, input.id), isNull(fornecedores.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Fornecedor não encontrado.' });
    }
    return rows[0];
  }),

  create: protectedProcedure.input(baseInputSchema).mutation(async ({ input, ctx }) => {
    const db = getDb();

    if (input.documento) {
      const existente = await db
        .select({ id: fornecedores.id })
        .from(fornecedores)
        .where(and(eq(fornecedores.documento, input.documento), isNull(fornecedores.deletedAt)))
        .limit(1);
      if (existente.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Já existe fornecedor com este documento.',
        });
      }
    }

    const [result] = await db.insert(fornecedores).values({
      nome: input.nome,
      documento: input.documento ?? null,
      telefone: input.telefone ?? null,
      email: input.email ? input.email : null,
      ativa: input.ativa ?? true,
      createdBy: ctx.user.id,
    });
    const insertId = (result as any).insertId as number;
    const [created] = await db
      .select()
      .from(fornecedores)
      .where(eq(fornecedores.id, insertId))
      .limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'fornecedores',
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
      .from(fornecedores)
      .where(and(eq(fornecedores.id, id), isNull(fornecedores.deletedAt)))
      .limit(1);
    if (!antes) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Fornecedor não encontrado.' });
    }

    if (patch.documento && patch.documento !== antes.documento) {
      const conflito = await db
        .select({ id: fornecedores.id })
        .from(fornecedores)
        .where(and(eq(fornecedores.documento, patch.documento), isNull(fornecedores.deletedAt)))
        .limit(1);
      if (conflito.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Já existe fornecedor com este documento.',
        });
      }
    }

    const dbPatch = { ...patch, email: patch.email === '' ? null : patch.email };
    await db.update(fornecedores).set(dbPatch).where(eq(fornecedores.id, id));
    const [depois] = await db.select().from(fornecedores).where(eq(fornecedores.id, id)).limit(1);

    await recordAudit({
      db,
      user: ctx.user,
      tabela: 'fornecedores',
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
        .from(fornecedores)
        .where(and(eq(fornecedores.id, input.id), isNull(fornecedores.deletedAt)))
        .limit(1);
      if (!antes) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fornecedor não encontrado.' });
      }

      await db
        .update(fornecedores)
        .set({ deletedAt: new Date() })
        .where(eq(fornecedores.id, input.id));

      await recordAudit({
        db,
        user: ctx.user,
        tabela: 'fornecedores',
        recordId: input.id,
        acao: 'DELETE',
        antes,
      });
      return { ok: true };
    }),
});
