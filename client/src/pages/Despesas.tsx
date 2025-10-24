import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Despesas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    unidadeId: "",
    categoriaId: "",
    descricao: "",
    valor: "",
    dataDespesa: new Date().toISOString().split('T')[0],
    dataVencimento: "",
    status: "paga" as const,
  });

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: categorias } = trpc.categorias.despesas.useQuery();
  const { data: despesas, refetch } = trpc.despesas.list.useQuery({
    unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
    startDate,
    endDate,
  });

  const createDespesa = trpc.despesas.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa cadastrada com sucesso!");
      setIsDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar despesa: " + error.message);
    },
  });

  const deleteDespesa = trpc.despesas.delete.useMutation({
    onSuccess: () => {
      toast.success("Despesa excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao excluir despesa: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      unidadeId: "",
      categoriaId: "",
      descricao: "",
      valor: "",
      dataDespesa: new Date().toISOString().split('T')[0],
      dataVencimento: "",
      status: "paga",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.unidadeId || !formData.categoriaId || !formData.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const valorEmCentavos = Math.round(parseFloat(formData.valor) * 100);

    createDespesa.mutate({
      unidadeId: parseInt(formData.unidadeId),
      categoriaId: parseInt(formData.categoriaId),
      descricao: formData.descricao || undefined,
      valor: valorEmCentavos,
      dataDespesa: formData.dataDespesa,
      dataVencimento: formData.dataVencimento || undefined,
      status: formData.status,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString + 'T00:00:00') : dateString;
    return date.toLocaleDateString('pt-BR');
  };

  const totalDespesas = despesas?.reduce((sum, d) => sum + d.valor, 0) || 0;

  // Agrupar categorias por tipo
  const categoriasAgrupadas = categorias?.reduce((acc, cat) => {
    if (!acc[cat.tipo]) acc[cat.tipo] = [];
    acc[cat.tipo].push(cat);
    return acc;
  }, {} as Record<string, typeof categorias>);

  const tipoLabels: Record<string, string> = {
    variavel: "Custos Variáveis",
    fixo: "Custos Fixos",
    investimento: "Investimentos",
    nao_operacional: "Não Operacionais",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
            <p className="text-muted-foreground">
              Gerencie as despesas do residencial
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Despesa</DialogTitle>
                <DialogDescription>
                  Preencha os dados da despesa abaixo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unidade">Unidade *</Label>
                    <Select
                      value={formData.unidadeId}
                      onValueChange={(value) => setFormData({ ...formData, unidadeId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades?.map((unidade) => (
                          <SelectItem key={unidade.id} value={unidade.id.toString()}>
                            {unidade.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select
                      value={formData.categoriaId}
                      onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoriasAgrupadas || {}).map(([tipo, cats]) => (
                          <div key={tipo}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {tipoLabels[tipo]}
                            </div>
                            {cats.map((categoria) => (
                              <SelectItem key={categoria.id} value={categoria.id.toString()}>
                                {categoria.nome}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Compra de alimentos no Unidasul"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paga">Paga</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataDespesa">Data da Despesa *</Label>
                    <Input
                      id="dataDespesa"
                      type="date"
                      value={formData.dataDespesa}
                      onChange={(e) => setFormData({ ...formData, dataDespesa: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataVencimento">Data de Vencimento</Label>
                    <Input
                      id="dataVencimento"
                      type="date"
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createDespesa.isPending}>
                    {createDespesa.isPending ? "Salvando..." : "Salvar Despesa"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Filtre as despesas por período e unidade</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total do Período</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
              </div>
            </div>
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
                <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
                  <SelectTrigger>
                    <SelectValue />
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Despesas</CardTitle>
            <CardDescription>
              {despesas?.length || 0} despesa(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma despesa encontrada no período
                    </TableCell>
                  </TableRow>
                ) : (
                  despesas?.map((despesa) => {
                    const categoria = categorias?.find(c => c.id === despesa.categoriaId);
                    return (
                      <TableRow key={despesa.id}>
                        <TableCell>{formatDate(despesa.dataDespesa)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{categoria?.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {categoria && tipoLabels[categoria.tipo]}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{despesa.descricao || "-"}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          {formatCurrency(despesa.valor)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            despesa.status === 'paga' ? 'bg-green-100 text-green-700' :
                            despesa.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {despesa.status === 'paga' ? 'Paga' :
                             despesa.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta despesa?')) {
                                deleteDespesa.mutate({ id: despesa.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

