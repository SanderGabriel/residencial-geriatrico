import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  date,
  mysqlEnum,
  json,
  uniqueIndex,
  index,
} from 'drizzle-orm/mysql-core';

// ---------- Users (OAuth-backed) ----------
export const users = mysqlTable(
  'users',
  {
    id: int('id').autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    nome: varchar('nome', { length: 255 }),
    role: mysqlEnum('role', ['admin', 'user']).notNull().default('user'),
    unidadeId: int('unidade_id'),
    ativo: boolean('ativo').notNull().default(true),
    ultimoAcesso: timestamp('ultimo_acesso'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index('idx_users_email').on(t.email), index('idx_users_ativo').on(t.ativo)],
);

// ---------- Unidades ----------
export const unidades = mysqlTable(
  'unidades',
  {
    id: int('id').autoincrement().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    descricao: text('descricao'),
    ativa: boolean('ativa').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    createdBy: int('created_by'),
  },
  (t) => [
    uniqueIndex('uq_unidades_nome').on(t.nome),
    index('idx_unidades_ativa_deleted').on(t.ativa, t.deletedAt),
  ],
);

// ---------- Categorias (dinâmicas) ----------
export const categorias = mysqlTable(
  'categorias',
  {
    id: int('id').autoincrement().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    grupo: varchar('grupo', { length: 100 }).notNull(),
    natureza: mysqlEnum('natureza', [
      'Receita',
      'Custo',
      'Despesa',
      'Imposto',
      'Investimento',
      'Não Operacional',
    ]).notNull(),
    ativa: boolean('ativa').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    createdBy: int('created_by'),
  },
  (t) => [
    index('idx_categorias_grupo').on(t.grupo),
    index('idx_categorias_natureza').on(t.natureza),
    index('idx_categorias_ativa_deleted').on(t.ativa, t.deletedAt),
    index('idx_categorias_nome').on(t.nome),
  ],
);

// ---------- Fornecedores ----------
export const fornecedores = mysqlTable(
  'fornecedores',
  {
    id: int('id').autoincrement().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    documento: varchar('documento', { length: 20 }),
    telefone: varchar('telefone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    ativa: boolean('ativa').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    createdBy: int('created_by'),
  },
  (t) => [
    index('idx_fornecedores_documento').on(t.documento),
    index('idx_fornecedores_ativa_deleted').on(t.ativa, t.deletedAt),
    index('idx_fornecedores_nome').on(t.nome),
  ],
);

// ---------- Formas de Pagamento ----------
export const formasPagamento = mysqlTable(
  'formas_pagamento',
  {
    id: int('id').autoincrement().primaryKey(),
    nome: varchar('nome', { length: 100 }).notNull(),
    ativa: boolean('ativa').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    createdBy: int('created_by'),
  },
  (t) => [
    uniqueIndex('uq_formas_pagamento_nome').on(t.nome),
    index('idx_formas_pagamento_ativa_deleted').on(t.ativa, t.deletedAt),
  ],
);

// ---------- Linhas de Margem (dinâmicas) ----------
export const linhasMargem = mysqlTable(
  'linhas_margem',
  {
    id: int('id').autoincrement().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    descricao: text('descricao'),
    requerNomeCustomizado: boolean('requer_nome_customizado').notNull().default(false),
    ativa: boolean('ativa').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    createdBy: int('created_by'),
  },
  (t) => [
    index('idx_linhas_margem_nome').on(t.nome),
    index('idx_linhas_margem_ativa_deleted').on(t.ativa, t.deletedAt),
  ],
);

// ---------- Movimentações ----------
export const movimentacoes = mysqlTable(
  'movimentacoes',
  {
    id: int('id').autoincrement().primaryKey(),
    unidadeId: int('unidade_id')
      .notNull()
      .references(() => unidades.id),
    tipo: mysqlEnum('tipo', ['Entrada', 'Saída']).notNull(),
    dataCaixa: date('data_caixa', { mode: 'string' }).notNull(),
    competencia: varchar('competencia', { length: 7 }).notNull(), // MM/AAAA
    valorTotal: decimal('valor_total', { precision: 12, scale: 2 }).notNull(),
    desconto: decimal('desconto', { precision: 12, scale: 2 }).notNull().default('0.00'),
    frete: decimal('frete', { precision: 12, scale: 2 }).notNull().default('0.00'),
    valorLiquido: decimal('valor_liquido', { precision: 12, scale: 2 }),
    formaPagamentoId: int('forma_pagamento_id').references(() => formasPagamento.id),
    fornecedorId: int('fornecedor_id').references(() => fornecedores.id),
    pagador: varchar('pagador', { length: 255 }),
    beneficiario: varchar('beneficiario', { length: 255 }),
    descricao: text('descricao'),
    linhaMargemId: int('linha_margem_id').references(() => linhasMargem.id),
    linhaMargemOtherName: varchar('linha_margem_other_name', { length: 255 }),
    tituloId: int('titulo_id'),
    isTest: boolean('is_test').notNull().default(false),
    testBatchId: varchar('test_batch_id', { length: 255 }),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    createdBy: int('created_by'),
  },
  (t) => [
    index('idx_movimentacoes_unidade').on(t.unidadeId),
    index('idx_movimentacoes_tipo').on(t.tipo),
    index('idx_movimentacoes_data_caixa').on(t.dataCaixa),
    index('idx_movimentacoes_competencia').on(t.competencia),
    index('idx_movimentacoes_forma_pagamento').on(t.formaPagamentoId),
    index('idx_movimentacoes_fornecedor').on(t.fornecedorId),
    index('idx_movimentacoes_titulo').on(t.tituloId),
    index('idx_movimentacoes_deleted').on(t.deletedAt),
  ],
);

// ---------- Rateios ----------
export const rateios = mysqlTable(
  'rateios',
  {
    id: int('id').autoincrement().primaryKey(),
    movimentacaoId: int('movimentacao_id')
      .notNull()
      .references(() => movimentacoes.id, { onDelete: 'cascade' }),
    categoriaId: int('categoria_id')
      .notNull()
      .references(() => categorias.id),
    valorBruto: decimal('valor_bruto', { precision: 12, scale: 2 }).notNull(),
    descontoRateado: decimal('desconto_rateado', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    freteRateado: decimal('frete_rateado', { precision: 12, scale: 2 }).notNull().default('0.00'),
    valorLiquidoFinal: decimal('valor_liquido_final', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index('idx_rateios_movimentacao').on(t.movimentacaoId),
    index('idx_rateios_categoria').on(t.categoriaId),
  ],
);

// ---------- Títulos ----------
export const titulos = mysqlTable(
  'titulos',
  {
    id: int('id').autoincrement().primaryKey(),
    unidadeId: int('unidade_id')
      .notNull()
      .references(() => unidades.id),
    tipo: mysqlEnum('tipo', ['Pagar', 'Receber']).notNull(),
    fornecedorId: int('fornecedor_id').references(() => fornecedores.id),
    residenteId: int('residente_id'),
    descricao: varchar('descricao', { length: 255 }).notNull(),
    valorTotal: decimal('valor_total', { precision: 12, scale: 2 }).notNull(),
    desconto: decimal('desconto', { precision: 12, scale: 2 }).notNull().default('0.00'),
    dataVencimento: date('data_vencimento', { mode: 'string' }).notNull(),
    competencia: varchar('competencia', { length: 7 }),
    valorRecebidoAcumulado: decimal('valor_recebido_acumulado', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    saldoEmAberto: decimal('saldo_em_aberto', { precision: 12, scale: 2 }),
    status: mysqlEnum('status', [
      'Previsto',
      'Parcial',
      'Pago',
      'Recebido',
      'Atrasado',
      'Cancelado',
    ])
      .notNull()
      .default('Previsto'),
    linhaMargemId: int('linha_margem_id').references(() => linhasMargem.id),
    linhaMargemOtherName: varchar('linha_margem_other_name', { length: 255 }),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    createdBy: int('created_by'),
  },
  (t) => [
    index('idx_titulos_unidade').on(t.unidadeId),
    index('idx_titulos_tipo').on(t.tipo),
    index('idx_titulos_vencimento').on(t.dataVencimento),
    index('idx_titulos_status').on(t.status),
    index('idx_titulos_deleted').on(t.deletedAt),
  ],
);

// ---------- Audit Log ----------
export const auditLog = mysqlTable(
  'audit_log',
  {
    id: int('id').autoincrement().primaryKey(),
    tabela: varchar('tabela', { length: 100 }).notNull(),
    recordId: int('record_id').notNull(),
    acao: mysqlEnum('acao', ['CREATE', 'UPDATE', 'DELETE']).notNull(),
    dadosAntes: json('dados_antes'),
    dadosDepois: json('dados_depois'),
    usuarioId: int('usuario_id'),
    usuarioNome: varchar('usuario_nome', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_tabela_record').on(t.tabela, t.recordId),
    index('idx_audit_usuario').on(t.usuarioId),
    index('idx_audit_timestamp').on(t.timestamp),
  ],
);

// ---------- Exported types ----------
export type Unidade = typeof unidades.$inferSelect;
export type UnidadeNew = typeof unidades.$inferInsert;
export type Categoria = typeof categorias.$inferSelect;
export type CategoriaNew = typeof categorias.$inferInsert;
export type Fornecedor = typeof fornecedores.$inferSelect;
export type FornecedorNew = typeof fornecedores.$inferInsert;
export type FormaPagamento = typeof formasPagamento.$inferSelect;
export type FormaPagamentoNew = typeof formasPagamento.$inferInsert;
export type LinhaMargem = typeof linhasMargem.$inferSelect;
export type LinhaMargemNew = typeof linhasMargem.$inferInsert;
export type Movimentacao = typeof movimentacoes.$inferSelect;
export type MovimentacaoNew = typeof movimentacoes.$inferInsert;
export type Rateio = typeof rateios.$inferSelect;
export type RateioNew = typeof rateios.$inferInsert;
export type Titulo = typeof titulos.$inferSelect;
export type TituloNew = typeof titulos.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type AuditLogNew = typeof auditLog.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserNew = typeof users.$inferInsert;
