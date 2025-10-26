import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Receitas from "./pages/Receitas";
import Despesas from "./pages/Despesas";
import Relatorios from "./pages/Relatorios";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import Fornecedores from "./pages/Fornecedores";
import Produtos from "@/pages/Produtos";
import Estoque from "@/pages/Estoque";
import Unidades from "@/pages/Unidades";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
              <Route path="/unidades" element={<Unidades />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/contas-pagar" element={<ContasPagar />} />
              <Route path="/contas-receber" element={<ContasReceber />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

