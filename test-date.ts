import { movimentacoesEstoque, InsertMovimentacaoEstoque } from "./drizzle/schema";

// Test what type is expected
const testInsert: InsertMovimentacaoEstoque = {
  unidadeId: 1,
  embalagemId: 1,
  tipo: "entrada",
  quantidade: 10,
  usuarioId: 1,
  dataMovimentacao: "2025-01-01", // Testing string
};

console.log("Type test passed");
