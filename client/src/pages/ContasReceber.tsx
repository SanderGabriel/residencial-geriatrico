import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Plus, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ContasReceber() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showPendentesOnly, setShowPendentesOnly] = useState(true);
  const [showMarcarDialog, setShowMarcarDialog] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<number | null>(null);
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  // Form state
  const [formData, setFormData] = useState({
    unidadeId: "",
    categoriaReceitaId: "",
    descricao: "",
    valorTotal: "",
    dataVencimento: "",
    observacoes: "",
    parcelado: false,
    numeroParcelas: "1",
  });

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: categorias } = trpc.categorias.receitas.useQuery();
  const { data: contas, refetch } = trpc.contasReceber.list.useQuery({
    unidadeId: selectedUnidade === "all" ? null : parseInt(selectedUnidade),
    startDate,
    endDate,
    pendentes: showPendentesOnly,
  });

  const createMutation = trpc.contasReceber.create.useMutation({
    onSuccess: () => {
      toast.success("Conta a receber cadastrada com sucesso!");
      refetch();
      setShowForm(false);
      setFormData({
        unidadeId: "",
        categoriaReceitaId: "",
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

  const marcarRecebidoMutation = trpc.contasReceber.marcarRecebido.useMutation({
    onSuccess: () => {
      toast.success("Conta marcada como recebida e receita criada!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao marcar como recebida: ${error.message}`);
    },
  });

  const deleteMutation = trpc.contasReceber.delete.useMutation({
    onSuccess: () => {
      toast.success("Conta excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir conta: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorEmCentavos = Math.round(parseFloat(formData.valorTotal) * 100);
    
    createMutation.mutate({
      unidadeId: parseInt(formData.unidadeId),
      categoriaReceitaId: parseInt(formData.categoriaReceitaId),
      descricao: formData.descricao,
      valorTotal: valorEmCentavos,
      dataVencimento: formData.dataVencimento,
      observacoes: formData.observacoes || null,
      parcelado: formData.parcelado,
      numeroParcelas: formData.parcelado ? parseInt(formData.numeroParcelas) : undefined,
    });
  };

  const handleMarcarRecebido = (id: number) => {
    setContaSelecionada(id);
    setShowMarcarDialog(true);
  };

  const confirmarRecebimento = () => {
    if (contaSelecionada && dataRecebimento) {
      marcarRecebidoMutation.mutate({ id: contaSelecionada, dataRecebimento });
      setShowMarcarDialog(false);
      setContaSelecionada(null);
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

  const totalPendente = contas?.filter(c => !c.dataRecebimento).reduce((sum, c) => sum + c.valorTotal, 0) || 0;
  const totalRecebido = contas?.filter(c => c.dataRecebimento).reduce((sum, c) => sum + c.valorTotal, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas a Receber</h1>
            <p className="text-muted-foreground">
              Gerencie suas contas pendentes e recebidas
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
              <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalPendente)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Recebido (Período)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalRecebido)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nova Conta a Receber</CardTitle>
              <CardDescription>Cadastre uma nova conta para recebimento futuro</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.unidadeId}
                      onChange={(e) => setFormData({ ...formData, unidadeId: e.target.value })}
                      required
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
                      value={formData.categoriaReceitaId}
                      onChange={(e) => setFormData({ ...formData, categoriaReceitaId: e.target.value })}
                      required
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
                    <Label>Descrição *</Label>
                    <Input
                      placeholder="Ex: Mensalidade Sr. João"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      required
                    />
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
                    />
                  </div>
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
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Salvar Conta"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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
              <DollarSign className="h-5 w-5" />
              Contas a Receber
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
                  className={`p-4 border rounded-lg ${conta.dataRecebimento ? 'bg-green-50 dark:bg-green-950' : 'bg-white dark:bg-gray-900'}`}
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
                        {conta.dataRecebimento && ` • Recebido em: ${formatDate(conta.dataRecebimento)}`}
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
                        {!conta.dataRecebimento && (
                          <Button
                            size="sm"
                            onClick={() => handleMarcarRecebido(conta.id)}
                            disabled={marcarRecebidoMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Marcar como Recebido
                          </Button>
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

      {/* Dialog para marcar como recebido */}
      {showMarcarDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Marcar como Recebido</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Data do Recebimento
                </label>
                <input
                  type="date"
                  value={dataRecebimento}
                  onChange={(e) => setDataRecebimento(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMarcarDialog(false);
                    setContaSelecionada(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarRecebimento}
                  disabled={!dataRecebimento}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

