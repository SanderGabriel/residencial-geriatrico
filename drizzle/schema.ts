import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, boolean, unique } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Unidades do residencial geriátrico
 */
export const unidades = mysqlTable("unidades", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
  descricao: text("descricao"),
  endereco: varchar("endereco", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  ativa: boolean("ativa").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Unidade = typeof unidades.$inferSelect;
export type InsertUnidade = typeof unidades.$inferInsert;

/**
 * Categorias de receita
 */
export const categoriasReceita = mysqlTable("categorias_receita", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  tipo: mysqlEnum("tipo", ["principal", "acessoria"]).default("acessoria").notNull(),
  ativa: boolean("ativa").default(true).notNull(),
  ordem: int("ordem"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CategoriaReceita = typeof categoriasReceita.$inferSelect;
export type InsertCategoriaReceita = typeof categoriasReceita.$inferInsert;

/**
 * Categorias de despesa
 */
export const categoriasDespesa = mysqlTable("categorias_despesa", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  tipo: mysqlEnum("tipo", ["variavel", "fixo", "investimento", "nao_operacional"]).default("variavel").notNull(),
  ativa: boolean("ativa").default(true).notNull(),
  ordem: int("ordem"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CategoriaDespesa = typeof categoriasDespesa.$inferSelect;
export type InsertCategoriaDespesa = typeof categoriasDespesa.$inferInsert;

/**
 * Receitas
 */
export const receitas = mysqlTable("receitas", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(),
  categoriaId: int("categoriaId").notNull(),
  descricao: varchar("descricao", { length: 255 }),
  valor: int("valor").notNull(), // Valor em centavos
  dataReceita: date("dataReceita").notNull(),
  dataVencimento: date("dataVencimento"),
  observacoes: text("observacoes"),
  status: mysqlEnum("status", ["pendente", "recebida", "cancelada"]).default("recebida").notNull(),
  usuarioId: int("usuarioId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Receita = typeof receitas.$inferSelect;
export type InsertReceita = typeof receitas.$inferInsert;

/**
 * Despesas
 */
export const despesas = mysqlTable("despesas", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(),
  categoriaId: int("categoriaId").notNull(),
  fornecedorId: int("fornecedorId"),
  descricao: varchar("descricao", { length: 255 }),
  valor: int("valor").notNull(), // Valor em centavos
  dataDespesa: date("dataDespesa").notNull(),
  dataVencimento: date("dataVencimento"),
  observacoes: text("observacoes"),
  status: mysqlEnum("status", ["pendente", "paga", "cancelada"]).default("paga").notNull(),
  usuarioId: int("usuarioId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Despesa = typeof despesas.$inferSelect;
export type InsertDespesa = typeof despesas.$inferInsert;

/**
 * Fornecedores
 */
export const fornecedores = mysqlTable("fornecedores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
  cnpj: varchar("cnpj", { length: 20 }),
  contato: varchar("contato", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  endereco: text("endereco"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = typeof fornecedores.$inferInsert;

/**
 * Categorias de produto
 */
export const categoriasProduto = mysqlTable("categorias_produto", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  ativa: boolean("ativa").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CategoriaProduto = typeof categoriasProduto.$inferSelect;
export type InsertCategoriaProduto = typeof categoriasProduto.$inferInsert;

/**
 * Produtos
 */
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  categoriaId: int("categoriaId").notNull(),
  descricao: text("descricao"),
  tipoEmbalagem: varchar("tipoEmbalagem", { length: 100 }),
  sku: varchar("sku", { length: 100 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Embalagens de produto (variações de tamanho/peso)
 */
export const embalagensProduto = mysqlTable("embalagens_produto", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId").notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  quantidade: int("quantidade").notNull(), // Quantidade em unidade base (ex: 500 para 500ml)
  unidadeMedida: varchar("unidadeMedida", { length: 50 }).notNull(), // 'ml', 'l', 'kg', 'g', 'unidade'
  ativa: boolean("ativa").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniqueProdutoEmbalagem: unique().on(table.produtoId, table.descricao),
}));

export type EmbalagemProduto = typeof embalagensProduto.$inferSelect;
export type InsertEmbalagemProduto = typeof embalagensProduto.$inferInsert;

/**
 * Preços por fornecedor
 */
export const precosFornecedor = mysqlTable("precos_fornecedor", {
  id: int("id").autoincrement().primaryKey(),
  embalagemId: int("embalagemId").notNull(),
  fornecedorId: int("fornecedorId").notNull(),
  precoCusto: int("precoCusto").notNull(), // Preço em centavos
  dataPreco: date("dataPreco").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrecoFornecedor = typeof precosFornecedor.$inferSelect;
export type InsertPrecoFornecedor = typeof precosFornecedor.$inferInsert;

/**
 * Estoque atual por unidade
 */
export const estoque = mysqlTable("estoque", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(),
  embalagemId: int("embalagemId").notNull(),
  quantidadeAtual: int("quantidadeAtual").default(0).notNull(),
  quantidadeMinima: int("quantidadeMinima").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueEstoque: unique().on(table.unidadeId, table.embalagemId),
}));

export type Estoque = typeof estoque.$inferSelect;
export type InsertEstoque = typeof estoque.$inferInsert;

/**
 * Movimentações de estoque (entrada/saída)
 */
export const movimentacoesEstoque = mysqlTable("movimentacoes_estoque", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(),
  embalagemId: int("embalagemId").notNull(),
  tipo: mysqlEnum("tipo", ["entrada", "saida"]).notNull(),
  quantidade: int("quantidade").notNull(),
  precoUnitario: int("precoUnitario"), // Preço em centavos (apenas para entrada)
  descricao: varchar("descricao", { length: 255 }),
  referenciaId: int("referenciaId"), // ID da compra/despesa relacionada
  usuarioId: int("usuarioId").notNull(),
  dataMovimentacao: date("dataMovimentacao").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MovimentacaoEstoque = typeof movimentacoesEstoque.$inferSelect;
export type InsertMovimentacaoEstoque = typeof movimentacoesEstoque.$inferInsert;

/**
 * Auditoria de ações
 */
export const auditoria = mysqlTable("auditoria", {
  id: int("id").autoincrement().primaryKey(),
  usuarioId: int("usuarioId").notNull(),
  tabela: varchar("tabela", { length: 100 }).notNull(),
  operacao: mysqlEnum("operacao", ["INSERT", "UPDATE", "DELETE"]).notNull(),
  idRegistro: int("idRegistro").notNull(),
  dadosAnteriores: text("dadosAnteriores"), // JSON
  dadosNovos: text("dadosNovos"), // JSON
  ipAddress: varchar("ipAddress", { length: 45 }),
  dataAcao: timestamp("dataAcao").defaultNow().notNull(),
});

export type Auditoria = typeof auditoria.$inferSelect;
export type InsertAuditoria = typeof auditoria.$inferInsert;



/**
 * Contas a Pagar
 */
export const contasPagar = mysqlTable("contas_pagar", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(),
  categoriaDespesaId: int("categoriaDespesaId").notNull(),
  fornecedorId: int("fornecedorId"),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valorTotal: int("valorTotal").notNull(), // Valor em centavos
  dataVencimento: date("dataVencimento").notNull(),
  dataPagamento: date("dataPagamento"),
  despesaId: int("despesaId"), // ID da despesa gerada quando pago
  observacoes: text("observacoes"),
  parcelaNumero: int("parcelaNumero"), // Número da parcela (1, 2, 3...)
  parcelaTotal: int("parcelaTotal"), // Total de parcelas
  contaPaiId: int("contaPaiId"), // ID da conta pai (para parcelas)
  usuarioId: int("usuarioId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContaPagar = typeof contasPagar.$inferSelect;
export type InsertContaPagar = typeof contasPagar.$inferInsert;

/**
 * Contas a Receber
 */
export const contasReceber = mysqlTable("contas_receber", {
  id: int("id").autoincrement().primaryKey(),
  unidadeId: int("unidadeId").notNull(),
  categoriaReceitaId: int("categoriaReceitaId").notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valorTotal: int("valorTotal").notNull(), // Valor em centavos
  dataVencimento: date("dataVencimento").notNull(),
  dataRecebimento: date("dataRecebimento"),
  receitaId: int("receitaId"), // ID da receita gerada quando recebido
  observacoes: text("observacoes"),
  parcelaNumero: int("parcelaNumero"), // Número da parcela (1, 2, 3...)
  parcelaTotal: int("parcelaTotal"), // Total de parcelas
  contaPaiId: int("contaPaiId"), // ID da conta pai (para parcelas)
  usuarioId: int("usuarioId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContaReceber = typeof contasReceber.$inferSelect;
export type InsertContaReceber = typeof contasReceber.$inferInsert;

