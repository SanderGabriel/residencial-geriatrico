import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { MovimentacaoForm } from '@/components/forms/MovimentacaoForm';

export function EditarMovimentacaoPage() {
  const [, params] = useRoute<{ id: string }>('/editar-movimentacao/:id');
  const id = params ? Number(params.id) : 0;

  // Carrega o registro só para descobrir o tipo (que não pode ser alterado).
  const movQ = trpc.movimentacoes.get.useQuery({ id }, { enabled: id > 0 });

  if (!id) {
    return <div className="text-sm text-red-600">ID inválido na URL.</div>;
  }
  if (movQ.isLoading) {
    return <div className="text-sm text-slate-500">Carregando…</div>;
  }
  if (movQ.isError || !movQ.data) {
    return <div className="text-sm text-red-600">Movimentação não encontrada.</div>;
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">
          Editar {movQ.data.tipo === 'Entrada' ? 'entrada' : 'saída'} #{id}
        </h1>
        <p className="text-slate-500">Alterações são registradas em auditoria.</p>
      </div>
      <MovimentacaoForm tipo={movQ.data.tipo} movimentacaoId={id} />
    </div>
  );
}
