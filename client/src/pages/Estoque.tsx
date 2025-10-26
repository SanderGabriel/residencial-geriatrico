import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Estoque() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  const [showEntradaForm, setShowEntradaForm] = useState(false);
  const [showSaidaForm, setShowSaidaForm] = useState(false);
  const [formData, setFormData] = useState({
    produtoId: "",
    embalagemId: "",
    quantidade: "",
    precoUnitario: "",
    fornecedorId: "",
    descricao: "",
    dataMovimentacao: new Date().toISOString().split("T")[0],
  });

  const { data: unidades } = trpc.unidades.list.useQuery();
  const { data: produtos } = trpc.produtos.list.useQuery();
  const { data: embalagens } = trpc.produtos.listEmbalagens.useQuery();
  const { data: fornecedores } = trpc.fornecedores.list.useQuery();
  
  // Buscar estoque da unidade selecionada
  const unidadeId = selectedUnidade === "all" ? 1 : parseInt(selectedUnidade);
  const { data: estoqueAtual, refetch: refetchEstoque } = trpc.estoque.byUnidade.useQuery(
    { unidadeId },
    { enabled: !!unidadeId }
  );

  const movimentarMutation = trpc.estoque.movimentar.useMutation({
    onSuccess: () => {
      toast.success("Movimentação registrada com sucesso!");
      refetchEstoque();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao registrar movimentação: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      produtoId: "",
      embalagemId: "",
      quantidade: "",
      precoUnitario: "",
      fornecedorId: "",
      descricao: "",
      dataMovimentacao: new Date().toISOString().split("T")[0],
    });
    setShowEntradaForm(false);
    setShowSaidaForm(false);
  };

  const handleSubmitEntrada = (e: React.FormEvent) => {
    e.preventDefault();
    movimentarMutation.mutate({
      unidadeId,
      embalagemId: parseInt(formData.embalagemId),
      tipo: "entrada",
      quantidade: parseFloat(formData.quantidade),
      precoUnitario: formData.precoUnitario ? parseFloat(formData.precoUnitario) : undefined,
      descricao: formData.descricao || undefined,
      dataMovimentacao: formData.dataMovimentacao,
    });
  };

  const handleSubmitSaida = (e: React.FormEvent) => {
    e.preventDefault();
    movimentarMutation.mutate({
      unidadeId,
      embalagemId: parseInt(formData.embalagemId),
      tipo: "saida",
      quantidade: parseFloat(formData.quantidade),
      descricao: formData.descricao || undefined,
      dataMovimentacao: formData.dataMovimentacao,
    });
  };

  // Filtrar embalagens do produto selecionado
  const embalagensFiltradas = formData.produtoId
    ? embalagens?.filter((e: any) => e.produtoId === parseInt(formData.produtoId))
    : [];

  // Calcular estoque total em litros/kg/unidades
  const calcularEstoqueTotal = () => {
    if (!estoqueAtual || !embalagens) return {};
    
    const estoquePorProduto: any = {};
    
    estoqueAtual.forEach((item: any) => {
      const embalagem = embalagens.find((e: any) => e.id === item.embalagemId);
      if (!embalagem) return;
      
      const produto = produtos?.find((p: any) => p.id === embalagem.produtoId);
      if (!produto) return;
      
      if (!estoquePorProduto[produto.id]) {
        estoquePorProduto[produto.id] = {
          nome: produto.nome,
          total: 0,
          unidade: embalagem.unidadeMedida,
        };
      }
      
      estoquePorProduto[produto.id].total += item.quantidadeAtual * embalagem.quantidade;
    });
    
    return estoquePorProduto;
  };

  const estoqueTotalPorProduto = calcularEstoqueTotal();

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Controle de Estoque</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowEntradaForm(true)} variant="default">
              + Registrar Entrada
            </Button>
            <Button onClick={() => setShowSaidaForm(true)} variant="outline">
              - Registrar Saída
            </Button>
          </div>
        </div>

        {/* Filtro de Unidade */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Filtrar por Unidade</label>
          <select
            value={selectedUnidade}
            onChange={(e) => setSelectedUnidade(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Unidades</option>
            {unidades?.map((unidade: any) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Formulário de Entrada */}
        {showEntradaForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Registrar Entrada (Compra)</h2>
            <form onSubmit={handleSubmitEntrada} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Produto *</label>
                <select
                  required
                  value={formData.produtoId}
                  onChange={(e) => setFormData({ ...formData, produtoId: e.target.value, embalagemId: "" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos?.map((produto: any) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Embalagem *</label>
                <select
                  required
                  value={formData.embalagemId}
                  onChange={(e) => setFormData({ ...formData, embalagemId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.produtoId}
                >
                  <option value="">Selecione uma embalagem</option>
                  {embalagensFiltradas?.map((embalagem: any) => (
                    <option key={embalagem.id} value={embalagem.id}>
                      {embalagem.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                  placeholder="Ex: 2 (dois galões)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preço Unitário</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precoUnitario}
                  onChange={(e) => setFormData({ ...formData, precoUnitario: e.target.value })}
                  placeholder="R$ 0,00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fornecedor</label>
                <select
                  value={formData.fornecedorId}
                  onChange={(e) => setFormData({ ...formData, fornecedorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores?.map((fornecedor: any) => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data da Compra *</label>
                <input
                  type="date"
                  required
                  value={formData.dataMovimentacao}
                  onChange={(e) => setFormData({ ...formData, dataMovimentacao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                  placeholder="Nota fiscal, observações..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Entrada</Button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário de Saída */}
        {showSaidaForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Registrar Saída (Consumo)</h2>
            <form onSubmit={handleSubmitSaida} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Produto *</label>
                <select
                  required
                  value={formData.produtoId}
                  onChange={(e) => setFormData({ ...formData, produtoId: e.target.value, embalagemId: "" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos?.map((produto: any) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Embalagem *</label>
                <select
                  required
                  value={formData.embalagemId}
                  onChange={(e) => setFormData({ ...formData, embalagemId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.produtoId}
                >
                  <option value="">Selecione uma embalagem</option>
                  {embalagensFiltradas?.map((embalagem: any) => (
                    <option key={embalagem.id} value={embalagem.id}>
                      {embalagem.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                  placeholder="Ex: 1 (um litro)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data do Consumo *</label>
                <input
                  type="date"
                  required
                  value={formData.dataMovimentacao}
                  onChange={(e) => setFormData({ ...formData, dataMovimentacao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Motivo/Observações</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                  placeholder="Motivo do consumo, observações..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Saída</Button>
              </div>
            </form>
          </div>
        )}

        {/* Estoque Atual */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Estoque Atual</h2>
          
          {Object.keys(estoqueTotalPorProduto).length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum produto em estoque.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produto</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantidade Total</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Unidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.values(estoqueTotalPorProduto).map((item: any, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{item.nome}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{item.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{item.unidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

