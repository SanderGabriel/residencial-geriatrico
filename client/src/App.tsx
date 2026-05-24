import { Route, Switch } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { trpc, queryClient, trpcClient } from './lib/trpc';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { HomePage } from './pages/Home';
import { NovaSaidaPage } from './pages/NovaSaida';
import { NovaEntradaPage } from './pages/NovaEntrada';
import { ExtratoPage } from './pages/Extrato';
import { TitulosPagarPage } from './pages/TitulosPagar';
import { TitulosReceberPage } from './pages/TitulosReceber';
import { AgendaVencimentosPage } from './pages/AgendaVencimentos';
import { RelatorioEconomiaPage } from './pages/RelatorioEconomia';
import { ConfiguracoesPage } from './pages/Configuracoes';
import { NotFoundPage } from './pages/NotFound';

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/nova-saida" component={NovaSaidaPage} />
            <Route path="/nova-entrada" component={NovaEntradaPage} />
            <Route path="/extrato" component={ExtratoPage} />
            <Route path="/titulos-pagar" component={TitulosPagarPage} />
            <Route path="/titulos-receber" component={TitulosReceberPage} />
            <Route path="/agenda" component={AgendaVencimentosPage} />
            <Route path="/economia" component={RelatorioEconomiaPage} />
            <Route path="/configuracoes" component={ConfiguracoesPage} />
            <Route component={NotFoundPage} />
          </Switch>
        </DashboardLayout>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
