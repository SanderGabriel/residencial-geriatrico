import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

export default function Relatorios() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("dre");
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: dre, isLoading } = trpc.relatorios.dre.useQuery({
    unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
    startDate,
    endDate,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground">
            Análises financeiras e relatórios estratégicos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione o período e a unidade para gerar os relatórios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={selectedUnidade}
                  onChange={(e) => setSelectedUnidade(e.target.value)}
                >
                  <option value="all">Todas as Unidades</option>
                  {unidades?.map((unidade) => (
                    <option key={unidade.id} value={unidade.id.toString()}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs simplificados com botões */}
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === "dre" ? "default" : "ghost"}
            onClick={() => setActiveTab("dre")}
          >
            DRE
          </Button>
          <Button variant="ghost" disabled>
            Curva ABC (em breve)
          </Button>
          <Button variant="ghost" disabled>
            Consumo (em breve)
          </Button>
        </div>

        {/* Conteúdo DRE */}
        {activeTab === "dre" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Demonstração do Resultado do Exercício (DRE)
              </CardTitle>
              <CardDescription>
                Período: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
                {selectedUnidade !== "all" && ` - ${unidades?.find(u => u.id === parseInt(selectedUnidade))?.nome}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando relatório...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Receitas */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b-2 border-green-600">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span className="font-bold text-lg">RECEITAS TOTAIS</span>
                      </div>
                      <span className="font-bold text-lg text-green-600">
                        {formatCurrency(dre?.receitas || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Custos Variáveis */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">(-) Custos Variáveis</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(dre?.custosVariaveis || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-b bg-muted/30">
                      <span className="font-bold">(=) LUCRO BRUTO</span>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {formatCurrency(dre?.lucroBruto || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Margem: {formatPercent(dre?.margemBruta || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custos Fixos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">(-) Custos Fixos</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(dre?.custosFixos || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-b bg-muted/30">
                      <span className="font-bold">(=) LUCRO OPERACIONAL</span>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {formatCurrency(dre?.lucroOperacional || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Margem: {formatPercent(dre?.margemOperacional || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Despesas Não Operacionais e Investimentos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">(-) Despesas Não Operacionais</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(dre?.despesasNaoOperacionais || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">(-) Investimentos</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(dre?.investimentos || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t-2 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-950">
                      <span className="font-bold text-lg">(=) LUCRO LÍQUIDO</span>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${(dre?.lucroLiquido || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(dre?.lucroLiquido || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Margem: {formatPercent(dre?.margemLiquida || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumo de Margens */}
                  <div className="grid grid-cols-3 gap-4 pt-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Margem Bruta</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatPercent(dre?.margemBruta || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Receitas - Custos Variáveis
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Margem Operacional</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatPercent(dre?.margemOperacional || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lucro Bruto - Custos Fixos
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${(dre?.margemLiquida || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatPercent(dre?.margemLiquida || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Resultado final sobre receitas
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

