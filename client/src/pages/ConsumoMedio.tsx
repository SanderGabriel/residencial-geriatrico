import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

export default function ConsumoMedio() {
  const [unidadeId, setUnidadeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3); // Últimos 3 meses por padrão
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: consumoData, isLoading, refetch } = trpc.relatorios.consumoMedio.useQuery({
    unidadeId,
    startDate,
    endDate,
  });

  const handleFiltrar = () => {
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critico":
        return "text-red-600 bg-red-50";
      case "atencao":
        return "text-yellow-600 bg-yellow-50";
      case "normal":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critico":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "atencao":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "normal":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "critico":
        return "Crítico";
      case "atencao":
        return "Atenção";
      case "normal":
        return "Normal";
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Relatório - Consumo Médio</h1>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleFiltrar} className="w-full">
                Filtrar
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : !consumoData || consumoData.produtos.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center py-8 text-gray-500">
            Nenhuma movimentação de estoque encontrada no período selecionado.
          </div>
        ) : (
          <>
            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border-2 border-blue-500 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Período Analisado</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {consumoData.estatisticas.periodoAnalisado.dias} dias
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  ({consumoData.estatisticas.periodoAnalisado.meses} meses)
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-500 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-red-700 mb-2">Produtos Críticos</h3>
                <p className="text-2xl font-bold text-red-900">
                  {consumoData.estatisticas.produtosCriticos}
                </p>
                <p className="text-sm text-red-600 mt-1">Estoque abaixo do mínimo</p>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-500 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-700 mb-2">Produtos em Atenção</h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {consumoData.estatisticas.produtosAtencao}
                </p>
                <p className="text-sm text-yellow-600 mt-1">Acabam em até 7 dias</p>
              </div>

              <div className="bg-green-50 border-2 border-green-500 p-6 rounded-lg">
                <h3 className="text-sm font-medium text-green-700 mb-2">Produtos Normais</h3>
                <p className="text-2xl font-bold text-green-900">
                  {consumoData.estatisticas.produtosNormal}
                </p>
                <p className="text-sm text-green-600 mt-1">Estoque adequado</p>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">
                Análise de Consumo ({consumoData.produtos.length} produtos)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produto</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Embalagem</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Consumo Diário</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Consumo Mensal</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Estoque Atual</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Estoque Mínimo</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Dias p/ Acabar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {consumoData.produtos.map((produto) => (
                      <tr key={produto.embalagemId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(produto.status)}`}>
                            {getStatusIcon(produto.status)}
                            <span className="text-xs font-medium">{getStatusLabel(produto.status)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{produto.produtoNome}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{produto.categoriaNome}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{produto.embalagemDescricao}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {produto.consumoDiario.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {produto.consumoMensal.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={produto.estoqueAtual <= produto.estoqueMinimo ? "text-red-600 font-bold" : ""}>
                            {produto.estoqueAtual}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {produto.estoqueMinimo}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={
                            produto.diasParaAcabar <= 7 
                              ? "text-red-600 font-bold" 
                              : produto.diasParaAcabar <= 15 
                                ? "text-yellow-600 font-medium" 
                                : "text-green-600"
                          }>
                            {produto.diasParaAcabar >= 999 ? "∞" : produto.diasParaAcabar}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Informações sobre o Relatório */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mt-6">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Como interpretar este relatório?</h3>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li><strong>Consumo Diário/Mensal:</strong> Média de consumo calculada com base nas saídas de estoque no período selecionado.</li>
                <li><strong>Dias para Acabar:</strong> Estimativa de quantos dias o estoque atual durará com base no consumo médio diário.</li>
                <li><strong>Status Crítico:</strong> Estoque atual está abaixo do mínimo configurado. Ação imediata necessária!</li>
                <li><strong>Status Atenção:</strong> Estoque acabará em até 7 dias. Programe a compra em breve.</li>
                <li><strong>Status Normal:</strong> Estoque adequado para o padrão de consumo atual.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

