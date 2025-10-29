import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Plus, Check, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateInputBR } from "@/components/ui/date-input-br";

export default function ContasPagar() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showPendentesOnly, setShowPendentesOnly] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false);
  const [contaParaPagar, setContaParaPagar] = useState<number | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  // Form state
  const [formData, setFormData] = useState({
    unidadeId: "",
    categoriaDespesaId: "",
    fornecedorId: "",
    descricao: "",
    valorTotal: "",
    dataVencimento: "",
    observacoes: "",
    parcelado: false,
    numeroParcelas: "1",
  });

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: categorias } = trpc.categorias.despesas.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  const { data: contas, refetch } = trpc.contasPagar.list.useQuery({
    unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
    startDate,
    endDate,
    pendentes: showPendentesOnly,
  });

  const createMutation = trpc.contasPagar.create.useMutation({
    onSuccess: () => {
      toast.success("Conta a pagar cadastrada com sucesso!");
      refetch();
      setShowForm(false);
      setFormData({
        unidadeId: "",
        categoriaDespesaId: "",
        fornecedorId: "",
        descricao: "",
        valorTotal: "",
        dataVencimento: "",
        observacoes: "",
        parcelado: false,
        numeroParcelas: "1",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar conta: ${error.message}`);
    },
  });

  const marcarPagoMutation = trpc.contasPagar.marcarPago.useMutation({
    onSuccess: () => {
      toast.success("Conta marcada como paga e despesa criada!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao marcar como paga: ${error.message}`);
    },
  });

  const deleteMutation = trpc.contasPagar.delete.useMutation({
    onSuccess: () => {
      toast.success("Conta excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir conta: ${error.message}`);
    },
  });

  const updateMutation = trpc.contasPagar.update.useMutation({
    onSuccess: () => {
      toast.success("Data de vencimento atualizada!");
      refetch();
      setEditingId(null);
      setFormData({
        unidadeId: "",
        categoriaDespesaId: "",
        fornecedorId: "",
        descricao: "",
        valorTotal: "",
        dataVencimento: "",
        observacoes: "",
        parcelado: false,
        numeroParcelas: "1",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorEmCentavos = Math.round(parseFloat(formData.valorTotal) * 100);
    
    createMutation.mutate({
      unidadeId: parseInt(formData.unidadeId),
      categoriaDespesaId: parseInt(formData.categoriaDespesaId),
      fornecedorId: formData.fornecedorId ? parseInt(formData.fornecedorId) : null,
      descricao: formData.descricao,
      valorTotal: valorEmCentavos,
      dataVencimento: formData.dataVencimento,
      observacoes: formData.observacoes || null,
      parcelado: formData.parcelado,
      numeroParcelas: formData.parcelado ? parseInt(formData.numeroParcelas) : undefined,
    });
  };

  const handleMarcarPago = (id: number) => {
    setContaParaPagar(id);
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setShowPagamentoDialog(true);
  };

  const confirmarPagamento = () => {
    if (contaParaPagar && dataPagamento) {
      marcarPagoMutation.mutate({ id: contaParaPagar, dataPagamento });
      setShowPagamentoDialog(false);
      setContaParaPagar(null);
      setDataPagamento("");
    }
  };

  const handleEdit = (conta: any) => {
    setEditingId(conta.id);
    setFormData({
      unidadeId: conta.unidadeId.toString(),
      categoriaDespesaId: conta.categoriaDespesaId.toString(),
      fornecedorId: conta.fornecedorId?.toString() || "",
      descricao: conta.descricao,
      valorTotal: (conta.valorTotal / 100).toString(),
      dataVencimento: new Date(conta.dataVencimento).toISOString().split('T')[0],
      observacoes: conta.observacoes || "",
      parcelado: false,
      numeroParcelas: "1",
    });
    setShowForm(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        dataVencimento: formData.dataVencimento,
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const totalPendente = contas?.filter(c => !c.dataPagamento).reduce((sum, c) => sum + c.valorTotal, 0) || 0;
  const totalPago = contas?.filter(c => c.dataPagamento).reduce((sum, c) => sum + c.valorTotal, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
            <p className="text-muted-foreground">
              Gerencie suas contas pendentes e pagas
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalPendente)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Pago (Período)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPago)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar Data de Vencimento" : "Nova Conta a Pagar"}</CardTitle>
              <CardDescription>
                {editingId ? "Altere a data de vencimento da conta" : "Cadastre uma nova conta para pagamento futuro"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingId ? handleUpdate : handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.unidadeId}
                      onChange={(e) => setFormData({ ...formData, unidadeId: e.target.value })}
                      required
                      disabled={!!editingId}
                    >
                      <option value="">Selecione...</option>
                      {unidades?.map((u) => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.categoriaDespesaId}
                      onChange={(e) => setFormData({ ...formData, categoriaDespesaId: e.target.value })}
                      required
                      disabled={!!editingId}
                    >
                      <option value="">Selecione...</option>
                      {categorias?.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.fornecedorId}
                      onChange={(e) => setFormData({ ...formData, fornecedorId: e.target.value })}
                      disabled={!!editingId}
                    >
                      <option value="">Nenhum</option>
                      {fornecedores?.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor Total *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.valorTotal}
                      onChange={(e) => setFormData({ ...formData, valorTotal: e.target.value })}
                      required
                      disabled={!!editingId}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input
                    placeholder="Ex: Nota fiscal #1234"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    disabled={!!editingId}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Vencimento *</Label>
                    <Input
                      type="date"
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.parcelado}
                        onCheckedChange={(checked) => setFormData({ ...formData, parcelado: checked as boolean })}
                        disabled={!!editingId}
                      />
                      Parcelado
                    </Label>
                    {formData.parcelado && (
                      <Input
                        type="number"
                        min="2"
                        placeholder="Número de parcelas"
                        value={formData.numeroParcelas}
                        onChange={(e) => setFormData({ ...formData, numeroParcelas: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Informações adicionais..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    disabled={!!editingId}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? (updateMutation.isPending ? "Atualizando..." : "Atualizar") : (createMutation.isPending ? "Salvando..." : "Salvar Conta")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      unidadeId: "",
                      categoriaDespesaId: "",
                      fornecedorId: "",
                      descricao: "",
                      valorTotal: "",
                      dataVencimento: "",
                      observacoes: "",
                      parcelado: false,
                      numeroParcelas: "1",
                    });
                  }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedUnidade}
                  onChange={(e) => setSelectedUnidade(e.target.value)}
                >
                  <option value="all">Todas</option>
                  {unidades?.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Checkbox
                    checked={showPendentesOnly}
                    onCheckedChange={(checked) => setShowPendentesOnly(checked as boolean)}
                  />
                  Apenas Pendentes
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Contas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Contas a Pagar
            </CardTitle>
            <CardDescription>
              {contas?.length || 0} conta(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contas?.map((conta) => (
                <div
                  key={conta.id}
                  className={`p-4 border rounded-lg ${conta.dataPagamento ? 'bg-green-50 dark:bg-green-950' : 'bg-white dark:bg-gray-900'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{conta.descricao}</h3>
                        {conta.parcelaNumero && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Parcela {conta.parcelaNumero}/{conta.parcelaTotal}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Vencimento: {formatDate(conta.dataVencimento)}
                        {conta.dataPagamento && ` • Pago em: ${formatDate(conta.dataPagamento)}`}
                      </div>
                      {conta.observacoes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {conta.observacoes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {formatCurrency(conta.valorTotal)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!conta.dataPagamento && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleMarcarPago(conta.id)}
                              disabled={marcarPagoMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Marcar como Pago
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(conta)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir esta conta?")) {
                              deleteMutation.mutate({ id: conta.id });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {contas?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada para o período selecionado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Informe a data em que o pagamento foi realizado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DateInputBR
              label="Data do Pagamento"
              value={dataPagamento}
              onChange={setDataPagamento}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPagamentoDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarPagamento}
              disabled={!dataPagamento || marcarPagoMutation.isPending}
            >
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

