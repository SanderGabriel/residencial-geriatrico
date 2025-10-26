import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";

export default function Unidades() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    endereco: "",
    telefone: "",
  });

  const { data: unidades, refetch } = trpc.unidades.list.useQuery();

  const createMutation = trpc.unidades.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada com sucesso!");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar unidade: ${error.message}`);
    },
  });

  const updateMutation = trpc.unidades.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso!");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar unidade: ${error.message}`);
    },
  });

  const deleteMutation = trpc.unidades.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir unidade: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      endereco: "",
      telefone: "",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (unidade: any) => {
    setFormData({
      nome: unidade.nome,
      descricao: unidade.descricao || "",
      endereco: unidade.endereco || "",
      telefone: unidade.telefone || "",
    });
    setEditingId(unidade.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta unidade?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Unidades</h1>
          <Button onClick={() => setShowForm(true)} variant="default">
            + Nova Unidade
          </Button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Editar Unidade" : "Nova Unidade"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Brigadeiro, Unidade Centro, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                         <PhoneInput
                label="Telefone"
                value={formData.telefone}
                onChange={(value) => setFormData({ ...formData, telefone: value })}
              />            </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Endereço</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  placeholder="Informações adicionais sobre a unidade..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Unidades */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Lista de Unidades</h2>
          
          {!unidades || unidades.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma unidade cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Telefone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Endereço</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Descrição</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {unidades.map((unidade: any) => (
                    <tr key={unidade.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{unidade.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{unidade.telefone || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{unidade.endereco || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {unidade.descricao ? (
                          <span className="line-clamp-2">{unidade.descricao}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(unidade)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(unidade.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
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

