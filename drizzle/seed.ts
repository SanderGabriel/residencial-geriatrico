/**
 * CLI: `pnpm db:seed`. Conecta no DATABASE_URL e roda runSeed().
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { runSeed } from './seed-data';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL não definida. Configure .env antes de rodar seed.');
  }

  console.log('🌱 Conectando ao banco...');
  const connection = await mysql.createPool(url);
  const db = drizzle(connection);

  const r = await runSeed(db);

  console.log('\n✅ Seed concluído.');
  console.log(`   Unidades:           ${r.inseridas.unidades} inseridas, ${r.existentes.unidades} já existiam`);
  console.log(`   Formas de pag:      ${r.inseridas.formas} inseridas, ${r.existentes.formas} já existiam`);
  console.log(`   Linhas margem:      ${r.inseridas.linhas} inseridas, ${r.existentes.linhas} já existiam`);
  console.log(`   Categorias:         ${r.inseridas.categorias} inseridas, ${r.existentes.categorias} já existiam`);

  await connection.end();
}

main().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
