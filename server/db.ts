import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import * as relations from '../drizzle/relations';
import { env } from './_core/env';

const fullSchema = { ...schema, ...relations };

export type DB = MySql2Database<typeof fullSchema>;

let pool: mysql.Pool | null = null;
let dbInstance: DB | null = null;

export function getDb(): DB {
  if (!dbInstance) {
    if (!env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL não configurada. Defina em .env antes de acessar o banco de dados.',
      );
    }
    pool = mysql.createPool(env.DATABASE_URL);
    dbInstance = drizzle(pool, { schema: fullSchema, mode: 'default' });
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}
