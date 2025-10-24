import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Receitas from "./pages/Receitas";
import Despesas from "./pages/Despesas";
import Relatorios from "./pages/Relatorios";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/receitas"} component={Receitas} />
      <Route path={"/despesas"} component={Despesas} />
      <Route path={"/estoque"} component={() => <div>Estoque (em desenvolvimento)</div>} />
      <Route path={"/produtos"} component={() => <div>Produtos (em desenvolvimento)</div>} />
      <Route path={"/fornecedores"} component={() => <div>Fornecedores (em desenvolvimento)</div>} />
      <Route path={"/unidades"} component={() => <div>Unidades (em desenvolvimento)</div>} />
      <Route path={"/relatorios"} component={Relatorios} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

