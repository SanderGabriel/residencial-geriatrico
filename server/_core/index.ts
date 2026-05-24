import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appRouter } from '../routers';
import { createContext } from './context';
import { env } from './env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
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
    // Em dev, o Vite serve o frontend em :5173 com proxy para /api → :3000.
    // Apenas avisamos.
    console.log('🔧 Dev mode: front-end servido pelo Vite (http://localhost:5173)');
  } else {
    // Em produção, servimos o build estático
    const distPath = path.resolve(__dirname, '../public');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = createServer(app);
  server.listen(env.PORT, () => {
    console.log(`🚀 Servidor escutando em http://localhost:${env.PORT}`);
    console.log(`📡 tRPC em http://localhost:${env.PORT}/api/trpc`);
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
