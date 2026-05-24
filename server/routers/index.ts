import { router, publicProcedure } from '../_core/trpc';
import { unidadesRouter } from './unidades';
import { categoriasRouter } from './categorias';
import { fornecedoresRouter } from './fornecedores';
import { formasPagRouter } from './formas-pag';
import { linhasMargemRouter } from './linhas-margem';
import { movimentacoesRouter } from './movimentacoes';
import { titulosRouter } from './titulos';
import { auditRouter } from './audit';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    phase: 'phase-1-parte-2-backend',
    timestamp: new Date().toISOString(),
  })),
  unidades: unidadesRouter,
  categorias: categoriasRouter,
  fornecedores: fornecedoresRouter,
  formasPagamento: formasPagRouter,
  linhasMargem: linhasMargemRouter,
  movimentacoes: movimentacoesRouter,
  titulos: titulosRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
