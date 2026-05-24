import type { MySql2Database } from 'drizzle-orm/mysql2';
import { auditLog } from '../../drizzle/schema';
import type { SessionUser } from '../_core/context';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type AuditableTable =
  | 'unidades'
  | 'categorias'
  | 'fornecedores'
  | 'formas_pagamento'
  | 'linhas_margem'
  | 'movimentacoes'
  | 'rateios'
  | 'titulos'
  | 'users';

interface RecordAuditArgs<TDB extends MySql2Database<any>> {
  db: TDB;
  user: SessionUser | null;
  tabela: AuditableTable;
  recordId: number;
  acao: AuditAction;
  antes?: unknown;
  depois?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Grava uma entrada de auditoria. Chame depois de cada mutation, dentro da
 * mesma transação quando possível (para consistência).
 *
 * dados_antes/dados_depois são JSON; o Drizzle serializa via mysqlEnum json().
 */
export async function recordAudit<TDB extends MySql2Database<any>>(
  args: RecordAuditArgs<TDB>,
): Promise<void> {
  const { db, user, tabela, recordId, acao, antes, depois, ipAddress, userAgent } = args;
  await db.insert(auditLog).values({
    tabela,
    recordId,
    acao,
    dadosAntes: antes ?? null,
    dadosDepois: depois ?? null,
    usuarioId: user?.id ?? null,
    usuarioNome: user?.nome ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}
