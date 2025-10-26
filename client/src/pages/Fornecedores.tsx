import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";

export default function Fornecedores() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    contato: "",
    telefone: "",
    email: "",
    endereco: "",
  });

  const { data: fornecedores, refetch } = trpc.fornecedores.list.useQuery();

  const createMutation = trpc.fornecedores.create.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor cadastrado com sucesso!");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar fornecedor: ${error.message}`);
    },
  });

  const updateMutation = trpc.fornecedores.update.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor atualizado com sucesso!");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar fornecedor: ${error.message}`);
    },
  });

  const deleteMutation = trpc.fornecedores.delete.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir fornecedor: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      contato: "",
      telefone: "",
      email: "",
      endereco: "",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (fornecedor: any) => {
    setFormData({
      nome: fornecedor.nome,
      contato: fornecedor.contato || "",
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      endereco: fornecedor.endereco || "",
    });
    setEditingId(fornecedor.id);
    setShowForm(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "Cancelar" : "Novo Fornecedor"}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome do Fornecedor *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Pessoa de Contato
                    </label>
                    <input
                      type="text"
                      value={formData.contato}
                      onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <PhoneInput
                      label="Telefone"
                      value={formData.telefone}
                      onChange={(value) => setFormData({ ...formData, telefone: value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Endereço
                    </label>
                    <textarea
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fornecedores?.map((fornecedor) => (
                <div
                  key={fornecedor.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{fornecedor.nome}</h3>
                      {fornecedor.contato && (
                        <p className="text-sm text-gray-600">Contato: {fornecedor.contato}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {fornecedor.telefone && (
                          <p className="text-sm text-gray-600">📞 {fornecedor.telefone}</p>
                        )}
                        {fornecedor.email && (
                          <p className="text-sm text-gray-600">📧 {fornecedor.email}</p>
                        )}
                        {fornecedor.endereco && (
                          <p className="text-sm text-gray-600">📍 {fornecedor.endereco}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(fornecedor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir ${fornecedor.nome}?`)) {
                            deleteMutation.mutate({ id: fornecedor.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {fornecedores?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor cadastrado ainda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

