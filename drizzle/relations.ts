import { relations } from 'drizzle-orm';
import {
  unidades,
  categorias,
  fornecedores,
  formasPagamento,
  linhasMargem,
  movimentacoes,
  rateios,
  titulos,
  users,
} from './schema';

export const unidadesRelations = relations(unidades, ({ many }) => ({
  movimentacoes: many(movimentacoes),
  titulos: many(titulos),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  unidade: one(unidades, {
    fields: [users.unidadeId],
    references: [unidades.id],
  }),
}));

export const fornecedoresRelations = relations(fornecedores, ({ many }) => ({
  movimentacoes: many(movimentacoes),
  titulos: many(titulos),
}));

export const formasPagamentoRelations = relations(formasPagamento, ({ many }) => ({
  movimentacoes: many(movimentacoes),
}));

export const linhasMargemRelations = relations(linhasMargem, ({ many }) => ({
  movimentacoes: many(movimentacoes),
  titulos: many(titulos),
}));

export const categoriasRelations = relations(categorias, ({ many }) => ({
  rateios: many(rateios),
}));

export const movimentacoesRelations = relations(movimentacoes, ({ one, many }) => ({
  unidade: one(unidades, {
    fields: [movimentacoes.unidadeId],
    references: [unidades.id],
  }),
  formaPagamento: one(formasPagamento, {
    fields: [movimentacoes.formaPagamentoId],
    references: [formasPagamento.id],
  }),
  fornecedor: one(fornecedores, {
    fields: [movimentacoes.fornecedorId],
    references: [fornecedores.id],
  }),
  linhaMargem: one(linhasMargem, {
    fields: [movimentacoes.linhaMargemId],
    references: [linhasMargem.id],
  }),
  titulo: one(titulos, {
    fields: [movimentacoes.tituloId],
    references: [titulos.id],
  }),
  rateios: many(rateios),
}));

export const rateiosRelations = relations(rateios, ({ one }) => ({
  movimentacao: one(movimentacoes, {
    fields: [rateios.movimentacaoId],
    references: [movimentacoes.id],
  }),
  categoria: one(categorias, {
    fields: [rateios.categoriaId],
    references: [categorias.id],
  }),
}));

export const titulosRelations = relations(titulos, ({ one, many }) => ({
  unidade: one(unidades, {
    fields: [titulos.unidadeId],
    references: [unidades.id],
  }),
  fornecedor: one(fornecedores, {
    fields: [titulos.fornecedorId],
    references: [fornecedores.id],
  }),
  linhaMargem: one(linhasMargem, {
    fields: [titulos.linhaMargemId],
    references: [linhasMargem.id],
  }),
  pagamentos: many(movimentacoes),
}));
