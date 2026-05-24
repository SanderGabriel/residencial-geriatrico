import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import * as relations from '../drizzle/relations';

const fullSchema = { ...schema, ...relations };

export type DB = MySql2Database<typeof fullSchema>;

let pool: mysql.Pool | null = null;
let dbInstance: DB | null = null;
let dbUrl: string | null = null;

/**
 * Conexão lazy ao MySQL. Lê DATABASE_URL do process.env a cada chamada para
 * suportar troca de URL em testes; mas mantém o pool em cache enquanto a URL
 * for a mesma para não recriar a cada query.
 */
export function getDb(): DB {
  const currentUrl = process.env.DATABASE_URL;
  if (!currentUrl) {
    throw new Error(
      'DATABASE_URL não configurada. Defina em .env antes de acessar o banco de dados.',
    );
  }
  if (!dbInstance || dbUrl !== currentUrl) {
    if (pool) {
      // URL mudou — encerra pool antigo de forma fire-and-forget.
      pool.end().catch(() => {});
    }
    pool = mysql.createPool(currentUrl);
    dbInstance = drizzle(pool, { schema: fullSchema, mode: 'default' });
    dbUrl = currentUrl;
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
    dbUrl = null;
  }
}
