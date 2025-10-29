import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Package, Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Produtos() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  const [formData, setFormData] = useState({
    categoriaId: "",
    nome: "",
    descricao: "",
    tipoEmbalagem: "",
    unidadeMedida: "",
    tamanho: "",
  });

  const { data: categorias } = trpc.categorias.produtos.useQuery();
  const { data: produtos, refetch } = trpc.produtos.list.useQuery();
  const { data: embalagens, refetch: refetchEmbalagens } = trpc.produtos.listEmbalagens.useQuery();

  const createProdutoMutation = trpc.produtos.create.useMutation({
    onSuccess: () => {
      toast.success("Produto cadastrado com sucesso!");
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao cadastrar produto: ${error.message}`);
    },
  });

  const createEmbalagemMutation = trpc.produtos.createEmbalagem.useMutation({
    onSuccess: () => {
      toast.success("Embalagem cadastrada com sucesso!");
      refetchEmbalagens();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao cadastrar embalagem: ${error.message}`);
    },
  });

  const deleteProdutoMutation = trpc.produtos.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto excluído com sucesso!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir produto: ${error.message}`);
    },
  });

  const deleteEmbalagemMutation = trpc.produtos.deleteEmbalagem.useMutation({
    onSuccess: () => {
      toast.success("Embalagem excluída com sucesso!");
      refetchEmbalagens();
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir embalagem: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      categoriaId: "",
      nome: "",
      descricao: "",
      tipoEmbalagem: "",
      unidadeMedida: "",
      tamanho: "",
    });
    setShowForm(false);
  };

  const handleSubmitProduto = (e: React.FormEvent) => {
    e.preventDefault();
    createProdutoMutation.mutate({
      categoriaId: parseInt(formData.categoriaId),
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      tipoEmbalagem: formData.tipoEmbalagem || undefined,
    });
  };

  const handleSubmitEmbalagem = (e: React.FormEvent, produtoId: number) => {
    e.preventDefault();
    createEmbalagemMutation.mutate({
      produtoId,
      unidadeMedida: formData.unidadeMedida,
      tamanho: formData.tamanho,
    });
  };

  const produtosFiltrados = produtos?.filter(
    (p: any) => selectedCategoria === "all" || p.categoriaId.toString() === selectedCategoria
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Produtos</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "Cancelar" : "Novo Produto"}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Novo Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProduto} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Categoria *
                    </label>
                    <select
                      required
                      value={formData.categoriaId}
                      onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Detergente, Arroz, Fralda..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Embalagem
                    </label>
                    <input
                      type="text"
                      value={formData.tipoEmbalagem}
                      onChange={(e) => setFormData({ ...formData, tipoEmbalagem: e.target.value })}
                      placeholder="Ex: Garrafa, Pacote, Caixa, Saco..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={2}
                      placeholder="Informações adicionais sobre o produto..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createProdutoMutation.isPending}>
                    Cadastrar Produto
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Produtos</CardTitle>
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as Categorias</option>
                {categorias?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {produtosFiltrados?.map((produto) => {
                const produtoEmbalagens = embalagens?.filter((e: any) => e.produtoId === produto.id) || [];
                const categoria = categorias?.find((c: any) => c.id === produto.categoriaId);
                
                return (
                  <div
                    key={produto.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-gray-500" />
                          <h3 className="font-semibold text-lg">{produto.nome}</h3>
                          <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {categoria?.nome}
                          </span>
                        </div>
                        {produto.descricao && (
                          <p className="text-sm text-gray-600 mt-1">{produto.descricao}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/produtos/${produto.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este produto?")) {
                            deleteProdutoMutation.mutate({ id: produto.id });
                          }
                        }}
                        disabled={deleteProdutoMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-sm text-gray-700">Embalagens Disponíveis</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const unidade = prompt("Unidade de medida (Ex: ml, g, kg, unid):");
                            const tamanho = prompt("Tamanho (Ex: 500, 1, 5):");
                            if (unidade && tamanho) {
                              createEmbalagemMutation.mutate({
                                produtoId: produto.id,
                                unidadeMedida: unidade,
                                tamanho: tamanho,
                              });
                            }
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Embalagem
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {produtoEmbalagens.map((emb: any) => (
                          <div
                            key={emb.id}
                            className="flex items-center justify-between p-2 bg-gray-100 rounded border"
                          >
                            <span className="text-sm font-medium">
                              {emb.tamanho} {emb.unidadeMedida}
                            </span>
                            <button
                              onClick={() => {
                                if (confirm("Excluir esta embalagem?")) {
                                  deleteEmbalagemMutation.mutate({ id: emb.id });
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {produtoEmbalagens.length === 0 && (
                          <div className="col-span-full text-center text-sm text-gray-500 py-2">
                            Nenhuma embalagem cadastrada
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {produtosFiltrados?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto cadastrado ainda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

