/**
 * Seed inicial: 4 unidades, 42 categorias, 9 linhas de margem, 5 formas de pagamento.
 * Idempotente — pode rodar várias vezes sem duplicar.
 *
 * Este módulo exporta a função pura `runSeed()`; o `seed.ts` chama via CLI,
 * e o startup do servidor também pode chamar automaticamente em produção.
 */
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq, isNull } from 'drizzle-orm';
import { unidades, categorias, formasPagamento, linhasMargem } from './schema';

type Natureza =
  | 'Receita'
  | 'Custo'
  | 'Despesa'
  | 'Imposto'
  | 'Investimento'
  | 'Não Operacional';

export const UNIDADES_SEED = [
  { nome: 'Novo Lar Luciana', descricao: '18 leitos' },
  { nome: 'Novo Lar Barão', descricao: '12 leitos' },
  { nome: 'Novo Lar Brigadeiro', descricao: '16 leitos' },
  { nome: 'Novo Lar Simeão', descricao: '19 leitos' },
];

export const FORMAS_PAGAMENTO_SEED = [
  { nome: 'Banco' },
  { nome: 'Dinheiro' },
  { nome: 'Cartão Débito' },
  { nome: 'Cartão Crédito' },
  { nome: 'PIX' },
];

export const LINHAS_MARGEM_SEED = [
  { nome: 'Fraldas', descricao: 'Margem em fraldas (receita - custo)' },
  { nome: 'Oxigênio', descricao: 'Margem em oxigênio' },
  { nome: 'Fisioterapia', descricao: 'Margem em fisioterapia' },
  { nome: 'Fonoaudiologia', descricao: 'Margem em fonoaudiologia' },
  { nome: 'Beleza', descricao: 'Margem em serviços de beleza' },
  { nome: 'Acompanhante', descricao: 'Margem em acompanhante' },
  { nome: 'Dietas/Suplementos', descricao: 'Margem em dietas e suplementos' },
  { nome: 'Materiais', descricao: 'Margem em materiais diversos' },
  {
    nome: 'Outros',
    descricao: 'Linha customizada — requer nome específico',
    requerNomeCustomizado: true,
  },
];

// 43 categorias do plano de contas — Seção 5 da Especificação Técnica
export const CATEGORIAS_SEED: { nome: string; grupo: string; natureza: Natureza }[] = [
  // 5.1 Receitas (7)
  { nome: 'Hospedagem', grupo: 'Receita', natureza: 'Receita' },
  { nome: 'Reembolso · Medicamentos/Farmácia', grupo: 'Receita', natureza: 'Receita' },
  { nome: 'Reembolso · Material Enfermagem', grupo: 'Receita', natureza: 'Receita' },
  { nome: 'Reembolso · Fraldas', grupo: 'Receita', natureza: 'Receita' },
  { nome: 'Reembolso · Dieta/Suplemento', grupo: 'Receita', natureza: 'Receita' },
  { nome: 'Reembolso · Serviços Externos', grupo: 'Receita', natureza: 'Receita' },
  { nome: 'Reembolso · Outras Despesas', grupo: 'Receita', natureza: 'Receita' },

  // 5.2 Custos Diretos (10)
  { nome: 'Farmácia/Medicamentos (custo)', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Material de Enfermagem (custo)', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Fraldas (custo)', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Dieta/Suplemento (custo)', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Carnes e Proteínas', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Hortifruti', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Laticínios e Frios', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Padaria e Cereais', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Mercearia', grupo: 'Custo Direto', natureza: 'Custo' },
  { nome: 'Sobremesas e Lanches', grupo: 'Custo Direto', natureza: 'Custo' },

  // 5.3 Higiene e Limpeza (3)
  { nome: 'Produtos de Limpeza', grupo: 'Higiene e Limpeza', natureza: 'Despesa' },
  { nome: 'Descartáveis', grupo: 'Higiene e Limpeza', natureza: 'Despesa' },
  { nome: 'Higiene Coletiva', grupo: 'Higiene e Limpeza', natureza: 'Despesa' },

  // 5.4 Despesas Fixas — Pessoal (3)
  { nome: 'Pessoal (folha)', grupo: 'Despesa Fixa - Pessoal', natureza: 'Despesa' },
  { nome: 'Pró-Labore', grupo: 'Despesa Fixa - Pessoal', natureza: 'Despesa' },
  { nome: 'Assessoria e Serviços', grupo: 'Despesa Fixa - Pessoal', natureza: 'Despesa' },

  // 5.5 Despesas Fixas — Estrutura (5)
  { nome: 'Manutenção', grupo: 'Despesa Fixa - Estrutura', natureza: 'Despesa' },
  { nome: 'Enxoval', grupo: 'Despesa Fixa - Estrutura', natureza: 'Despesa' },
  { nome: 'Material de Escritório', grupo: 'Despesa Fixa - Estrutura', natureza: 'Despesa' },
  { nome: 'Tributos', grupo: 'Despesa Fixa - Estrutura', natureza: 'Imposto' },
  { nome: 'Frete/Logística', grupo: 'Despesa Fixa - Estrutura', natureza: 'Despesa' },

  // 5.6 Despesas Fixas — Utilidades (5)
  { nome: 'Água', grupo: 'Despesa Fixa - Utilidades', natureza: 'Despesa' },
  { nome: 'Luz/Energia', grupo: 'Despesa Fixa - Utilidades', natureza: 'Despesa' },
  { nome: 'Gás', grupo: 'Despesa Fixa - Utilidades', natureza: 'Despesa' },
  { nome: 'Telefone/Internet', grupo: 'Despesa Fixa - Utilidades', natureza: 'Despesa' },
  { nome: 'Segurança', grupo: 'Despesa Fixa - Utilidades', natureza: 'Despesa' },

  // 5.7 Eventos (4)
  { nome: 'Eventos · Alimentos', grupo: 'Eventos', natureza: 'Despesa' },
  { nome: 'Eventos · Bebidas', grupo: 'Eventos', natureza: 'Despesa' },
  { nome: 'Eventos · Decoração e Suprimentos', grupo: 'Eventos', natureza: 'Despesa' },
  { nome: 'Outros Custos Fixos', grupo: 'Eventos', natureza: 'Despesa' },

  // 5.8 Neutras (6)
  { nome: 'Empréstimo Recebido', grupo: 'Neutras', natureza: 'Não Operacional' },
  { nome: 'Transferência Recebida', grupo: 'Neutras', natureza: 'Não Operacional' },
  { nome: 'Investimento em Ativo', grupo: 'Neutras', natureza: 'Investimento' },
  { nome: 'CDC/Financiamento', grupo: 'Neutras', natureza: 'Não Operacional' },
  { nome: 'Transferência Enviada', grupo: 'Neutras', natureza: 'Não Operacional' },
  { nome: 'Empréstimo Devolvido', grupo: 'Neutras', natureza: 'Não Operacional' },
];

export interface SeedResult {
  inseridas: { unidades: number; formas: number; linhas: number; categorias: number };
  existentes: { unidades: number; formas: number; linhas: number; categorias: number };
}

/**
 * Aplica o seed sobre um db Drizzle conectado. Idempotente.
 * Não fecha a conexão (caller é dono dela).
 */
export async function runSeed(db: MySql2Database<any>): Promise<SeedResult> {
  const result: SeedResult = {
    inseridas: { unidades: 0, formas: 0, linhas: 0, categorias: 0 },
    existentes: { unidades: 0, formas: 0, linhas: 0, categorias: 0 },
  };

  for (const u of UNIDADES_SEED) {
    const existe = await db
      .select({ id: unidades.id })
      .from(unidades)
      .where(and(eq(unidades.nome, u.nome), isNull(unidades.deletedAt)))
      .limit(1);
    if (existe.length === 0) {
      await db.insert(unidades).values(u);
      result.inseridas.unidades++;
    } else {
      result.existentes.unidades++;
    }
  }

  for (const f of FORMAS_PAGAMENTO_SEED) {
    const existe = await db
      .select({ id: formasPagamento.id })
      .from(formasPagamento)
      .where(eq(formasPagamento.nome, f.nome))
      .limit(1);
    if (existe.length === 0) {
      await db.insert(formasPagamento).values(f);
      result.inseridas.formas++;
    } else {
      result.existentes.formas++;
    }
  }

  for (const l of LINHAS_MARGEM_SEED) {
    const existe = await db
      .select({ id: linhasMargem.id })
      .from(linhasMargem)
      .where(and(eq(linhasMargem.nome, l.nome), isNull(linhasMargem.deletedAt)))
      .limit(1);
    if (existe.length === 0) {
      await db.insert(linhasMargem).values(l);
      result.inseridas.linhas++;
    } else {
      result.existentes.linhas++;
    }
  }

  for (const c of CATEGORIAS_SEED) {
    const existe = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(and(eq(categorias.nome, c.nome), isNull(categorias.deletedAt)))
      .limit(1);
    if (existe.length === 0) {
      await db.insert(categorias).values(c);
      result.inseridas.categorias++;
    } else {
      result.existentes.categorias++;
    }
  }

  return result;
}
