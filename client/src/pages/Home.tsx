import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  
  // Datas do mês atual
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const startDate = firstDay.toISOString().split('T')[0];
  const endDate = lastDay.toISOString().split('T')[0];

  // Buscar unidades
  const { data: unidades } = trpc.unidades.list.useQuery();
  
  // Buscar dados do dashboard
  const { data: dashboard, isLoading } = trpc.relatorios.dashboard.useQuery({
    unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
    startDate,
    endDate,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100); // Converter de centavos para reais
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do período: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {unidades?.map((unidade) => (
                <SelectItem key={unidade.id} value={unidade.id.toString()}>
                  {unidade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receitas Totais</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboard?.totalReceitas || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.quantidadeReceitas || 0} lançamentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(dashboard?.totalDespesas || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.quantidadeDespesas || 0} lançamentos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(dashboard?.lucro || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboard?.lucro || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(dashboard?.lucro || 0) >= 0 ? 'Lucro' : 'Prejuízo'} no período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
                <Percent className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(dashboard?.margemLucro || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatPercent(dashboard?.margemLucro || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sobre as receitas totais
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo ao Sistema de Gestão</CardTitle>
              <CardDescription>
                Sistema completo para gerenciamento financeiro e de estoque do seu residencial geriátrico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Utilize o menu lateral para navegar entre as funcionalidades:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Receitas e Despesas para controle financeiro</li>
                <li>Estoque para controle de produtos e insumos</li>
                <li>Relatórios para análises gerenciais (DRE, Curva ABC, etc.)</li>
                <li>Gestão de Unidades, Fornecedores e Produtos</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos Passos</CardTitle>
              <CardDescription>
                Comece a usar o sistema agora mesmo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Para começar a usar o sistema:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Cadastre suas unidades (se necessário)</li>
                <li>Cadastre fornecedores e produtos</li>
                <li>Comece a lançar receitas e despesas</li>
                <li>Registre movimentações de estoque</li>
                <li>Consulte os relatórios gerenciais</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

