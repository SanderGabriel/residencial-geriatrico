import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { appRouter } from '../routers';
import { createContext } from './context';
import { env } from './env';
import { runSeed } from '../../drizzle/seed-data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Roda migrations + seed automaticamente no boot.
 *
 * Idempotente — pode rodar várias vezes sem duplicar.
 * Desativa com AUTO_MIGRATE=false (migrations) ou AUTO_SEED=false (seed).
 */
async function runMigrationsAndSeed() {
  if (!env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL não definida — pulando migrations.');
    return;
  }
  if (process.env.AUTO_MIGRATE === 'false') {
    console.log('ℹ️  AUTO_MIGRATE=false — pulando migrations.');
    return;
  }

  // Em produção: bundle vai pra dist/index.js, pasta drizzle/migrations fica
  // na raiz do projeto (cwd). Em dev: rodando via tsx, idem.
  const candidatos = [
    path.resolve(process.cwd(), 'drizzle/migrations'),
    path.resolve(__dirname, '../drizzle/migrations'),
    path.resolve(__dirname, '../../drizzle/migrations'),
  ];
  const migrationsFolder = candidatos.find((p) => fs.existsSync(p));
  if (!migrationsFolder) {
    console.error('❌ Pasta de migrations não encontrada. Procurei em:', candidatos);
    throw new Error('Migrations folder não encontrada');
  }

  console.log(`📦 Aplicando migrations de ${migrationsFolder}…`);
  const conn = await mysql.createConnection(env.DATABASE_URL);
  try {
    const db = drizzle(conn);
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations aplicadas.');

    if (process.env.AUTO_SEED !== 'false') {
      console.log('🌱 Aplicando seed (idempotente)…');
      const r = await runSeed(db);
      const totalInseridos =
        r.inseridas.unidades +
        r.inseridas.formas +
        r.inseridas.linhas +
        r.inseridas.categorias;
      if (totalInseridos === 0) {
        console.log('   (todos os dados-mestre já existiam)');
      } else {
        console.log(
          `   +${r.inseridas.unidades} unidades, +${r.inseridas.formas} formas pag, +${r.inseridas.linhas} linhas margem, +${r.inseridas.categorias} categorias`,
        );
      }
    }
  } finally {
    await conn.end();
  }
}

async function start() {
  await runMigrationsAndSeed();

  const app = express();

  app.use(express.json({ limit: '5mb' }));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, env: env.NODE_ENV });
  });

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  if (env.NODE_ENV === 'development') {
    console.log('🔧 Dev mode: front-end servido pelo Vite (http://localhost:5173)');
  } else {
    const distPath = path.resolve(__dirname, 'public');
    app.use(express.static(distPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = createServer(app);
  server.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor escutando em http://0.0.0.0:${env.PORT}`);
    console.log(`📡 tRPC em /api/trpc`);
  });

  const shutdown = async () => {
    console.log('🛑 Encerrando servidor...');
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('❌ Falha ao iniciar servidor:', err);
  process.exit(1);
});
