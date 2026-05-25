import { router, publicProcedure } from '../_core/trpc';
import { unidadesRouter } from './unidades';
import { categoriasRouter } from './categorias';
import { fornecedoresRouter } from './fornecedores';
import { formasPagRouter } from './formas-pag';
import { linhasMargemRouter } from './linhas-margem';
import { movimentacoesRouter } from './movimentacoes';
import { titulosRouter } from './titulos';
import { auditRouter } from './audit';
import { relatoriosRouter } from './relatorios';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    phase: 'phase-1-complete',
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
  relatorios: relatoriosRouter,
});

export type AppRouter = typeof appRouter;
