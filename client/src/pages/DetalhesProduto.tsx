import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Package, TrendingDown, TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DetalhesProduto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const produtoId = parseInt(id || "0");

  const [unidadeFiltro, setUnidadeFiltro] = useState<number | null>(null);

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: detalhes, isLoading } = trpc.gestaoEstoque.detalhesProduto.useQuery({
    produtoId,
    unidadeId: unidadeFiltro,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg">Carregando detalhes do produto...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!detalhes) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="text-lg">Produto não encontrado</div>
          <Button onClick={() => navigate("/produtos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Produtos
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Preparar dados para gráficos
  const movimentacoesPorMes = detalhes.movimentacoes.reduce((acc: any, mov) => {
    const mes = new Date(mov.dataMovimentacao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    if (!acc[mes]) {
      acc[mes] = { mes, entradas: 0, saidas: 0 };
    }
    if (mov.tipo === 'entrada') {
      acc[mes].entradas += mov.quantidade;
    } else {
      acc[mes].saidas += mov.quantidade;
    }
    return acc;
  }, {});

  const dadosGrafico = Object.values(movimentacoesPorMes).reverse();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/produtos")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{detalhes.produto.nome}</h1>
              <p className="text-muted-foreground">
                {detalhes.produto.categoriaNome} • {detalhes.produto.tipoEmbalagem || "Sem tipo"}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Unidade</Label>
                <Select
                  value={unidadeFiltro?.toString() || "todas"}
                  onValueChange={(value) => setUnidadeFiltro(value === "todas" ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as Unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Unidades</SelectItem>
                    {unidades?.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consumo Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{detalhes.estatisticas.consumoTotal}</div>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consumo Médio</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{detalhes.estatisticas.consumoMedioMensal}</div>
              <p className="text-xs text-muted-foreground">Por mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{detalhes.estatisticas.totalEntradas}</div>
              <p className="text-xs text-muted-foreground">Compras realizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Compra</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {detalhes.estatisticas.ultimaCompra
                  ? new Date(detalhes.estatisticas.ultimaCompra).toLocaleDateString('pt-BR')
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">Data da última entrada</p>
            </CardContent>
          </Card>
        </div>

        {/* Estoque Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Estoque Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detalhes.estoques.length === 0 ? (
              <p className="text-muted-foreground">Nenhum estoque registrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Unidade</th>
                      <th className="text-left py-2">Embalagem</th>
                      <th className="text-right py-2">Quantidade Atual</th>
                      <th className="text-right py-2">Quantidade Mínima</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhes.estoques.map((est, idx) => {
                      const status = est.quantidadeAtual <= est.quantidadeMinima ? "Crítico" : "Normal";
                      const statusColor = status === "Crítico" ? "text-red-600" : "text-green-600";
                      return (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{est.unidadeNome}</td>
                          <td className="py-2">{est.embalagemDescricao}</td>
                          <td className="text-right py-2">{est.quantidadeAtual}</td>
                          <td className="text-right py-2">{est.quantidadeMinima}</td>
                          <td className={`text-right py-2 font-semibold ${statusColor}`}>{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Movimentações (Últimos 12 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosGrafico.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="entradas" stroke="#10b981" name="Entradas" strokeWidth={2} />
                  <Line type="monotone" dataKey="saidas" stroke="#ef4444" name="Saídas" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Movimentações */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {detalhes.movimentacoes.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Data</th>
                      <th className="text-left py-2">Tipo</th>
                      <th className="text-left py-2">Unidade</th>
                      <th className="text-left py-2">Embalagem</th>
                      <th className="text-right py-2">Quantidade</th>
                      <th className="text-right py-2">Preço Unit.</th>
                      <th className="text-left py-2">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhes.movimentacoes.map((mov) => (
                      <tr key={mov.id} className="border-b">
                        <td className="py-2">{new Date(mov.dataMovimentacao).toLocaleDateString('pt-BR')}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="py-2">{mov.unidadeNome}</td>
                        <td className="py-2">{mov.embalagemDescricao}</td>
                        <td className="text-right py-2">{mov.quantidade}</td>
                        <td className="text-right py-2">
                          {mov.precoUnitario ? `R$ ${(mov.precoUnitario / 100).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2">{mov.descricao || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

