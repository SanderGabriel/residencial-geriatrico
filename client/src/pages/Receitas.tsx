import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Receitas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  
  // Datas do mês atual
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  // Form state
  const [formData, setFormData] = useState({
    unidadeId: "",
    categoriaId: "",
    descricao: "",
    valor: "",
    dataReceita: new Date().toISOString().split('T')[0],
    dataVencimento: "",
    status: "recebida" as const,
  });

  // Queries
  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: categorias } = trpc.categorias.receitas.useQuery();
  const { data: receitas, refetch } = trpc.receitas.list.useQuery({
    unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
    startDate,
    endDate,
  });

  // Mutations
  const utils = trpc.useUtils();
  const createReceita = trpc.receitas.create.useMutation({
    onSuccess: () => {
      toast.success("Receita cadastrada com sucesso!");
      setIsDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar receita: " + error.message);
    },
  });

  const deleteReceita = trpc.receitas.delete.useMutation({
    onSuccess: () => {
      toast.success("Receita excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao excluir receita: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      unidadeId: "",
      categoriaId: "",
      descricao: "",
      valor: "",
      dataReceita: new Date().toISOString().split('T')[0],
      dataVencimento: "",
      status: "recebida",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.unidadeId || !formData.categoriaId || !formData.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Converter valor de reais para centavos
    const valorEmCentavos = Math.round(parseFloat(formData.valor) * 100);

    createReceita.mutate({
      unidadeId: parseInt(formData.unidadeId),
      categoriaId: parseInt(formData.categoriaId),
      descricao: formData.descricao || undefined,
      valor: valorEmCentavos,
      dataReceita: formData.dataReceita,
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

  const totalReceitas = receitas?.reduce((sum, r) => sum + r.valor, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receitas</h1>
            <p className="text-muted-foreground">
              Gerencie as receitas do residencial
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Receita</DialogTitle>
                <DialogDescription>
                  Preencha os dados da receita abaixo
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
                        {categorias?.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id.toString()}>
                            {categoria.nome}
                          </SelectItem>
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
                    placeholder="Ex: Mensalidade Quarto 101"
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
                        <SelectItem value="recebida">Recebida</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataReceita">Data da Receita *</Label>
                    <Input
                      id="dataReceita"
                      type="date"
                      value={formData.dataReceita}
                      onChange={(e) => setFormData({ ...formData, dataReceita: e.target.value })}
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
                  <Button type="submit" disabled={createReceita.isPending}>
                    {createReceita.isPending ? "Salvando..." : "Salvar Receita"}
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
                <CardDescription>Filtre as receitas por período e unidade</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total do Período</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
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
            <CardTitle>Lista de Receitas</CardTitle>
            <CardDescription>
              {receitas?.length || 0} receita(s) encontrada(s)
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
                {receitas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma receita encontrada no período
                    </TableCell>
                  </TableRow>
                ) : (
                  receitas?.map((receita) => {
                    const categoria = categorias?.find(c => c.id === receita.categoriaId);
                    return (
                      <TableRow key={receita.id}>
                        <TableCell>{formatDate(receita.dataReceita)}</TableCell>
                        <TableCell>{categoria?.nome}</TableCell>
                        <TableCell>{receita.descricao || "-"}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(receita.valor)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            receita.status === 'recebida' ? 'bg-green-100 text-green-700' :
                            receita.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {receita.status === 'recebida' ? 'Recebida' :
                             receita.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta receita?')) {
                                deleteReceita.mutate({ id: receita.id });
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

