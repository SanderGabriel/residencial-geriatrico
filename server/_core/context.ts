import type { Request, Response } from 'express';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { env } from './env';

export interface SessionUser {
  id: number;
  email: string;
  nome: string | null;
  role: 'admin' | 'user';
  unidadeId: number | null;
}

export interface AppContext {
  req: Request;
  res: Response;
  user: SessionUser | null;
}

/**
 * Cria o contexto de cada request tRPC.
 * Phase 1: usa mock OAuth quando VITE_MOCK_OAUTH=true. Integração com Manus OAuth
 * será adicionada em Phase 2 (T5.x).
 */
export async function createContext({ req, res }: CreateExpressContextOptions): Promise<AppContext> {
  let user: SessionUser | null = null;

  if (env.VITE_MOCK_OAUTH) {
    user = {
      id: 1,
      email: 'dev@novo-lar.local',
      nome: env.OWNER_NAME ?? 'Dev Owner',
      role: 'admin',
      unidadeId: null,
    };
  }

  return { req, res, user };
}
