import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  unidades,
  categoriasReceita,
  categoriasDespesa,
  categoriasProduto,
  receitas,
  despesas,
  fornecedores,
  produtos,
  embalagensProduto,
  precosFornecedor,
  estoque,
  movimentacoesEstoque
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// === UNIDADES ===
export async function getAllUnidades() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(unidades).where(eq(unidades.ativa, true)).orderBy(unidades.nome);
}

// === CATEGORIAS ===
export async function getAllCategoriasReceita() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categoriasReceita).where(eq(categoriasReceita.ativa, true)).orderBy(categoriasReceita.ordem);
}

export async function getAllCategoriasDespesa() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categoriasDespesa).where(eq(categoriasDespesa.ativa, true)).orderBy(categoriasDespesa.ordem);
}

export async function getAllCategoriasProduto() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categoriasProduto).where(eq(categoriasProduto.ativa, true)).orderBy(categoriasProduto.nome);
}

// === FORNECEDORES ===
export async function getAllFornecedores() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(fornecedores).where(eq(fornecedores.ativo, true)).orderBy(fornecedores.nome);
}

// === RECEITAS ===
export async function getReceitasByPeriod(unidadeId: number | null, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    sql`${receitas.dataReceita} >= ${startDate}`,
    sql`${receitas.dataReceita} <= ${endDate}`
  ];
  
  if (unidadeId) {
    conditions.push(eq(receitas.unidadeId, unidadeId));
  }
  
  return await db.select().from(receitas)
    .where(and(...conditions))
    .orderBy(desc(receitas.dataReceita));
}

// === DESPESAS ===
export async function getDespesasByPeriod(unidadeId: number | null, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    sql`${despesas.dataDespesa} >= ${startDate}`,
    sql`${despesas.dataDespesa} <= ${endDate}`
  ];
  
  if (unidadeId) {
    conditions.push(eq(despesas.unidadeId, unidadeId));
  }
  
  return await db.select().from(despesas)
    .where(and(...conditions))
    .orderBy(desc(despesas.dataDespesa));
}

// === PRODUTOS ===
export async function getAllProdutos() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(produtos).where(eq(produtos.ativo, true)).orderBy(produtos.nome);
}

export async function getProdutosByCategoria(categoriaId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(produtos)
    .where(and(eq(produtos.categoriaId, categoriaId), eq(produtos.ativo, true)))
    .orderBy(produtos.nome);
}

// === EMBALAGENS ===
export async function getEmbalagensByProduto(produtoId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(embalagensProduto)
    .where(and(eq(embalagensProduto.produtoId, produtoId), eq(embalagensProduto.ativa, true)));
}

// === ESTOQUE ===
export async function getEstoqueByUnidade(unidadeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(estoque).where(eq(estoque.unidadeId, unidadeId));
}

// === MOVIMENTAÇÕES ===
export async function getMovimentacoesByPeriod(unidadeId: number | null, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    sql`${movimentacoesEstoque.dataMovimentacao} >= ${startDate}`,
    sql`${movimentacoesEstoque.dataMovimentacao} <= ${endDate}`
  ];
  
  if (unidadeId) {
    conditions.push(eq(movimentacoesEstoque.unidadeId, unidadeId));
  }
  
  return await db.select().from(movimentacoesEstoque)
    .where(and(...conditions))
    .orderBy(desc(movimentacoesEstoque.dataMovimentacao));
}

