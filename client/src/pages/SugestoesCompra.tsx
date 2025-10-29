import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, AlertTriangle, RefreshCw, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SugestoesCompra() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  const [diasSeguranca, setDiasSeguranca] = useState(15);

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: sugestoes, refetch, isLoading } = trpc.gestaoEstoque.sugestoesCompra.useQuery({
    unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
  });

  const calcularEstoqueMinimoMutation = trpc.gestaoEstoque.calcularEstoqueMinimo.useMutation({
    onSuccess: (data) => {
      toast.success(`Estoque mínimo calculado! ${data.atualizados} itens atualizados.`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao calcular estoque mínimo: ${error.message}`);
    },
  });

  const handleCalcularEstoqueMinimo = () => {
    calcularEstoqueMinimoMutation.mutate({
      unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
      diasSeguranca,
    });
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta": return "text-red-600 bg-red-50 border-red-200";
      case "media": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "baixa": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPrioridadeLabel = (prioridade: string) => {
    switch (prioridade) {
      case "alta": return "URGENTE";
      case "media": return "ATENÇÃO";
      case "baixa": return "NORMAL";
      default: return "DESCONHECIDO";
    }
  };

  const sugestoesAlta = sugestoes?.filter(s => s.prioridade === "alta") || [];
  const sugestoesMedia = sugestoes?.filter(s => s.prioridade === "media") || [];
  const suggestoesBaixa = sugestoes?.filter(s => s.prioridade === "baixa") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sugestões de Compra</h1>
            <p className="text-muted-foreground">
              Recomendações inteligentes baseadas em consumo histórico
            </p>
          </div>
          <Button onClick={handleCalcularEstoqueMinimo} disabled={calcularEstoqueMinimoMutation.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalcular Estoque Mínimo
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Configure os parâmetros de análise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Unidade</label>
                <select
                  value={selectedUnidade}
                  onChange={(e) => setSelectedUnidade(e.target.value)}
                  className="w-full border rounded-md p-2"
                >
                  <option value="all">Todas as Unidades</option>
                  {unidades?.map((u) => (
                    <option key={u.id} value={u.id.toString()}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dias de Segurança (para cálculo de estoque mínimo)
                </label>
                <input
                  type="number"
                  value={diasSeguranca}
                  onChange={(e) => setDiasSeguranca(parseInt(e.target.value))}
                  className="w-full border rounded-md p-2"
                  min="1"
                  max="90"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Prioridade Alta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{sugestoesAlta.length}</div>
              <p className="text-xs text-red-600 mt-1">Estoque crítico (≤7 dias)</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Prioridade Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{sugestoesMedia.length}</div>
              <p className="text-xs text-yellow-600 mt-1">Estoque baixo (8-15 dias)</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Prioridade Baixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{suggestoesBaixa.length}</div>
              <p className="text-xs text-blue-600 mt-1">Estoque adequado (&gt;15 dias)</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Sugestões */}
        <Card>
          <CardHeader>
            <CardTitle>Recomendações de Compra</CardTitle>
            <CardDescription>
              {isLoading ? "Carregando..." : `${sugestoes?.length || 0} produto(s) necessitam atenção`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando sugestões...</div>
            ) : !sugestoes || sugestoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma sugestão de compra no momento</p>
                <p className="text-sm mt-2">Todos os estoques estão adequados!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sugestoes.map((sugestao, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getPrioridadeColor(sugestao.prioridade)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{sugestao.produtoNome}</h3>
                          <span className="px-2 py-1 text-xs font-bold rounded">
                            {getPrioridadeLabel(sugestao.prioridade)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Embalagem</p>
                            <p className="font-medium">{sugestao.embalagemDescricao}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Unidade</p>
                            <p className="font-medium">{sugestao.unidadeNome}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Estoque Atual</p>
                            <p className="font-medium">{sugestao.estoqueAtual} un</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Estoque Mínimo</p>
                            <p className="font-medium">{sugestao.estoqueMinimo} un</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Consumo Médio/Dia</p>
                            <p className="font-medium">{sugestao.consumoMedioDiario} un</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Dias Restantes</p>
                            <p className="font-medium font-bold">
                              {sugestao.diasRestantes} {sugestao.diasRestantes === 1 ? "dia" : "dias"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Quantidade Sugerida</p>
                            <p className="font-bold text-lg">{sugestao.quantidadeSugerida} unidades</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre o Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Estoque Mínimo:</strong> Calculado automaticamente com base no consumo médio dos últimos 90 dias multiplicado pelos dias de segurança configurados.
            </p>
            <p>
              <strong>Consumo Médio:</strong> Baseado nas movimentações de saída dos últimos 30 dias.
            </p>
            <p>
              <strong>Quantidade Sugerida:</strong> Quantidade necessária para manter estoque para 30 dias, considerando o consumo atual.
            </p>
            <p>
              <strong>Prioridades:</strong> Alta (≤7 dias), Média (8-15 dias), Baixa (&gt;15 dias de estoque restante).
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

