import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function CurvaABC() {
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
  const { data: curvaAbcData, isLoading, refetch } = trpc.relatorios.curvaAbc.useQuery({
    unidadeId,
    startDate,
    endDate,
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

  const produtosClasseA = useMemo(() => {
    return curvaAbcData?.produtos.filter(p => p.classe === "A") || [];
  }, [curvaAbcData]);

  const produtosClasseB = useMemo(() => {
    return curvaAbcData?.produtos.filter(p => p.classe === "B") || [];
  }, [curvaAbcData]);

  const produtosClasseC = useMemo(() => {
    return curvaAbcData?.produtos.filter(p => p.classe === "C") || [];
  }, [curvaAbcData]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Relatório - Curva ABC</h1>

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
        ) : !curvaAbcData || curvaAbcData.produtos.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center py-8 text-gray-500">
            Nenhuma movimentação de estoque encontrada no período selecionado.
          </div>
        ) : (
          <>
            {/* Resumo por Classe */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border-2 border-green-500 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-green-700 mb-2">Classe A</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Produtos que representam ~80% do valor total
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Produtos:</span>
                    <span className="text-sm">{curvaAbcData.estatisticas.classeA.quantidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valor Total:</span>
                    <span className="text-sm font-bold text-green-700">
                      {formatCurrency(curvaAbcData.estatisticas.classeA.valorTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">% do Total:</span>
                    <span className="text-sm font-bold">
                      {curvaAbcData.estatisticas.classeA.percentual.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-500 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-700 mb-2">Classe B</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Produtos que representam ~15% do valor total
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Produtos:</span>
                    <span className="text-sm">{curvaAbcData.estatisticas.classeB.quantidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valor Total:</span>
                    <span className="text-sm font-bold text-yellow-700">
                      {formatCurrency(curvaAbcData.estatisticas.classeB.valorTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">% do Total:</span>
                    <span className="text-sm font-bold">
                      {curvaAbcData.estatisticas.classeB.percentual.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-500 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-red-700 mb-2">Classe C</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Produtos que representam ~5% do valor total
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Produtos:</span>
                    <span className="text-sm">{curvaAbcData.estatisticas.classeC.quantidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valor Total:</span>
                    <span className="text-sm font-bold text-red-700">
                      {formatCurrency(curvaAbcData.estatisticas.classeC.valorTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">% do Total:</span>
                    <span className="text-sm font-bold">
                      {curvaAbcData.estatisticas.classeC.percentual.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Produtos Classe A */}
            {produtosClasseA.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-lg font-semibold mb-4 text-green-700">
                  Produtos Classe A ({produtosClasseA.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produto</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Embalagem</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantidade</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Valor Total</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% Valor</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {produtosClasseA.map((produto) => (
                        <tr key={produto.embalagemId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{produto.produtoNome}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{produto.categoriaNome}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{produto.embalagemDescricao}</td>
                          <td className="px-4 py-3 text-sm text-right">{produto.quantidade}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(produto.valorTotal)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {produto.percentualValor.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                            {produto.percentualAcumulado.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Produtos Classe B */}
            {produtosClasseB.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-lg font-semibold mb-4 text-yellow-700">
                  Produtos Classe B ({produtosClasseB.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-yellow-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produto</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Embalagem</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantidade</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Valor Total</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% Valor</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {produtosClasseB.map((produto) => (
                        <tr key={produto.embalagemId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{produto.produtoNome}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{produto.categoriaNome}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{produto.embalagemDescricao}</td>
                          <td className="px-4 py-3 text-sm text-right">{produto.quantidade}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(produto.valorTotal)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {produto.percentualValor.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-yellow-700">
                            {produto.percentualAcumulado.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Produtos Classe C */}
            {produtosClasseC.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-lg font-semibold mb-4 text-red-700">
                  Produtos Classe C ({produtosClasseC.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produto</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Embalagem</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantidade</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Valor Total</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% Valor</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">% Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {produtosClasseC.map((produto) => (
                        <tr key={produto.embalagemId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{produto.produtoNome}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{produto.categoriaNome}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{produto.embalagemDescricao}</td>
                          <td className="px-4 py-3 text-sm text-right">{produto.quantidade}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(produto.valorTotal)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {produto.percentualValor.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-red-700">
                            {produto.percentualAcumulado.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Informações sobre a Curva ABC */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-semibold text-blue-900 mb-2">📊 O que é a Curva ABC?</h3>
              <p className="text-sm text-blue-800 mb-2">
                A Curva ABC é uma ferramenta de gestão que classifica os produtos por ordem de importância baseada no valor de consumo:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li><strong>Classe A:</strong> Produtos mais importantes (~80% do valor total). Requerem atenção especial no controle de estoque.</li>
                <li><strong>Classe B:</strong> Produtos de importância intermediária (~15% do valor total). Controle moderado.</li>
                <li><strong>Classe C:</strong> Produtos menos críticos (~5% do valor total). Controle simplificado.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

