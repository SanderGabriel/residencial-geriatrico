import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function AnalisesComparativas() {
  const [unidadeId, setUnidadeId] = useState<number | null>(null);
  
  // Período 1 (padrão: mês passado)
  const [periodo1Inicio, setPeriodo1Inicio] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 2);
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [periodo1Fim, setPeriodo1Fim] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(0);
    return date.toISOString().split("T")[0];
  });

  // Período 2 (padrão: mês atual)
  const [periodo2Inicio, setPeriodo2Inicio] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [periodo2Fim, setPeriodo2Fim] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: comparativoData, isLoading, refetch } = trpc.relatorios.comparativo.useQuery({
    unidadeId,
    periodo1Inicio,
    periodo1Fim,
    periodo2Inicio,
    periodo2Fim,
  });

  const handleFiltrar = () => {
    refetch();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const getVariacaoIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (value < 0) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-600" />;
  };

  const getVariacaoColor = (value: number, inverso = false) => {
    // inverso = true para despesas (vermelho quando aumenta)
    if (inverso) {
      if (value > 0) return "text-red-600";
      if (value < 0) return "text-green-600";
    } else {
      if (value > 0) return "text-green-600";
      if (value < 0) return "text-red-600";
    }
    return "text-gray-600";
  };

  const formatPeriodo = (inicio: string, fim: string) => {
    const dataInicio = new Date(inicio + "T00:00:00");
    const dataFim = new Date(fim + "T00:00:00");
    return `${dataInicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} a ${dataFim.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Análises Comparativas entre Períodos</h1>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Período 1 */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-blue-900 mb-3">Período 1 (Base)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Data Início</label>
                  <input
                    type="date"
                    value={periodo1Inicio}
                    onChange={(e) => setPeriodo1Inicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Data Fim</label>
                  <input
                    type="date"
                    value={periodo1Fim}
                    onChange={(e) => setPeriodo1Fim(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Período 2 */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold text-green-900 mb-3">Período 2 (Comparação)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Data Início</label>
                  <input
                    type="date"
                    value={periodo2Inicio}
                    onChange={(e) => setPeriodo2Inicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Data Fim</label>
                  <input
                    type="date"
                    value={periodo2Fim}
                    onChange={(e) => setPeriodo2Fim(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Unidade</label>
              <select
                value={unidadeId || ""}
                onChange={(e) => setUnidadeId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as Unidades</option>
                {unidades?.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleFiltrar} className="w-full">
                Comparar Períodos
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : !comparativoData ? (
          <div className="bg-white p-6 rounded-lg shadow text-center py-8 text-gray-500">
            Clique em "Comparar Períodos" para visualizar a análise.
          </div>
        ) : (
          <>
            {/* Resumo dos Períodos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Período 1 */}
              <div className="bg-blue-50 border-2 border-blue-500 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Período 1 (Base)</h3>
                <p className="text-sm text-blue-700 mb-4">
                  {formatPeriodo(comparativoData.periodo1.inicio, comparativoData.periodo1.fim)}
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Receitas:</span>
                    <span className="text-lg font-bold text-green-700">
                      {formatCurrency(comparativoData.periodo1.totalReceitas)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Despesas:</span>
                    <span className="text-lg font-bold text-red-700">
                      {formatCurrency(comparativoData.periodo1.totalDespesas)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-blue-300">
                    <span className="text-sm font-medium">Lucro:</span>
                    <span className="text-lg font-bold text-blue-900">
                      {formatCurrency(comparativoData.periodo1.lucro)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Margem:</span>
                    <span className="text-lg font-bold text-blue-900">
                      {comparativoData.periodo1.margem.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Período 2 */}
              <div className="bg-green-50 border-2 border-green-500 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-green-900 mb-2">Período 2 (Comparação)</h3>
                <p className="text-sm text-green-700 mb-4">
                  {formatPeriodo(comparativoData.periodo2.inicio, comparativoData.periodo2.fim)}
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Receitas:</span>
                    <span className="text-lg font-bold text-green-700">
                      {formatCurrency(comparativoData.periodo2.totalReceitas)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Despesas:</span>
                    <span className="text-lg font-bold text-red-700">
                      {formatCurrency(comparativoData.periodo2.totalDespesas)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-green-300">
                    <span className="text-sm font-medium">Lucro:</span>
                    <span className="text-lg font-bold text-green-900">
                      {formatCurrency(comparativoData.periodo2.lucro)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Margem:</span>
                    <span className="text-lg font-bold text-green-900">
                      {comparativoData.periodo2.margem.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Análise de Variações */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowUpCircle className="w-6 h-6 text-blue-600" />
                Análise de Variações (Período 2 vs Período 1)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Variação de Receitas */}
                <div className="border-2 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Receitas</span>
                    {getVariacaoIcon(comparativoData.variacoes.receitas)}
                  </div>
                  <p className={`text-2xl font-bold ${getVariacaoColor(comparativoData.variacoes.receitas)}`}>
                    {formatPercentage(comparativoData.variacoes.receitas)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {comparativoData.variacoes.receitas > 0 ? "Aumento" : comparativoData.variacoes.receitas < 0 ? "Redução" : "Estável"}
                  </p>
                </div>

                {/* Variação de Despesas */}
                <div className="border-2 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Despesas</span>
                    {getVariacaoIcon(comparativoData.variacoes.despesas)}
                  </div>
                  <p className={`text-2xl font-bold ${getVariacaoColor(comparativoData.variacoes.despesas, true)}`}>
                    {formatPercentage(comparativoData.variacoes.despesas)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {comparativoData.variacoes.despesas > 0 ? "Aumento" : comparativoData.variacoes.despesas < 0 ? "Redução" : "Estável"}
                  </p>
                </div>

                {/* Variação de Lucro */}
                <div className="border-2 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Lucro</span>
                    {getVariacaoIcon(comparativoData.variacoes.lucro)}
                  </div>
                  <p className={`text-2xl font-bold ${getVariacaoColor(comparativoData.variacoes.lucro)}`}>
                    {formatPercentage(comparativoData.variacoes.lucro)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {comparativoData.variacoes.lucro > 0 ? "Melhoria" : comparativoData.variacoes.lucro < 0 ? "Piora" : "Estável"}
                  </p>
                </div>

                {/* Variação de Margem */}
                <div className="border-2 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Margem</span>
                    {getVariacaoIcon(comparativoData.variacoes.margem)}
                  </div>
                  <p className={`text-2xl font-bold ${getVariacaoColor(comparativoData.variacoes.margem)}`}>
                    {comparativoData.variacoes.margem >= 0 ? "+" : ""}{comparativoData.variacoes.margem.toFixed(2)}pp
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {comparativoData.variacoes.margem > 0 ? "Melhoria" : comparativoData.variacoes.margem < 0 ? "Piora" : "Estável"}
                  </p>
                </div>
              </div>

              {/* Interpretação */}
              <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">📊 Interpretação dos Resultados</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  {comparativoData.variacoes.receitas > 0 && comparativoData.variacoes.despesas < comparativoData.variacoes.receitas && (
                    <p>✅ <strong>Cenário positivo:</strong> As receitas cresceram mais que as despesas, resultando em melhoria do lucro.</p>
                  )}
                  {comparativoData.variacoes.receitas < 0 && (
                    <p>⚠️ <strong>Atenção:</strong> Houve redução nas receitas. Avalie as causas e estratégias de recuperação.</p>
                  )}
                  {comparativoData.variacoes.despesas > comparativoData.variacoes.receitas && (
                    <p>⚠️ <strong>Alerta:</strong> As despesas cresceram mais que as receitas, impactando negativamente o lucro.</p>
                  )}
                  {comparativoData.variacoes.margem > 0 && (
                    <p>✅ <strong>Eficiência melhorou:</strong> A margem de lucro aumentou em {comparativoData.variacoes.margem.toFixed(2)} pontos percentuais.</p>
                  )}
                  {comparativoData.variacoes.margem < 0 && (
                    <p>⚠️ <strong>Eficiência reduziu:</strong> A margem de lucro diminuiu em {Math.abs(comparativoData.variacoes.margem).toFixed(2)} pontos percentuais.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

