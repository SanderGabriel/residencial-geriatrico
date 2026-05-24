import { router, publicProcedure } from '../_core/trpc';

/**
 * appRouter — Phase 1 (foundation): apenas health-check.
 *
 * Os routers de domínio (unidades, categorias, fornecedores, formas-pag, linhas-margem,
 * movimentacoes, rateios, titulos, audit) entram na Parte 2 do desenvolvimento.
 */
export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    phase: 'phase-1-foundation',
    timestamp: new Date().toISOString(),
  })),
});

export type AppRouter = typeof appRouter;
