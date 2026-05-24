import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { auditLog } from '../../drizzle/schema';
import { getDb } from '../db';
import { adminProcedure, router } from '../_core/trpc';
import { idSchema, paginationSchema } from '../helpers/validation';

const tabelaSchema = z.enum([
  'unidades',
  'categorias',
  'fornecedores',
  'formas_pagamento',
  'linhas_margem',
  'movimentacoes',
  'rateios',
  'titulos',
  'users',
]);

const acaoSchema = z.enum(['CREATE', 'UPDATE', 'DELETE']);

export const auditRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          tabela: tabelaSchema.optional(),
          recordId: idSchema.optional(),
          acao: acaoSchema.optional(),
          usuarioId: idSchema.optional(),
          desde: z.coerce.date().optional(),
          ate: z.coerce.date().optional(),
          pagination: paginationSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const f = input ?? {};
      const conds = [] as any[];
      if (f.tabela) conds.push(eq(auditLog.tabela, f.tabela));
      if (f.recordId) conds.push(eq(auditLog.recordId, f.recordId));
      if (f.acao) conds.push(eq(auditLog.acao, f.acao));
      if (f.usuarioId) conds.push(eq(auditLog.usuarioId, f.usuarioId));
      if (f.desde) conds.push(gte(auditLog.timestamp, f.desde));
      if (f.ate) conds.push(lte(auditLog.timestamp, f.ate));

      const pag = f.pagination ?? { page: 1, pageSize: 50 };
      const where = conds.length > 0 ? and(...conds) : undefined;
      const items = await db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.timestamp), desc(auditLog.id))
        .limit(pag.pageSize)
        .offset((pag.page - 1) * pag.pageSize);
      return { items, page: pag.page, pageSize: pag.pageSize };
    }),

  get: adminProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(auditLog).where(eq(auditLog.id, input.id)).limit(1);
    if (rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro de auditoria não encontrado.' });
    }
    return rows[0];
  }),
});
