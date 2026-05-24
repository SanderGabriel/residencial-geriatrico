import { MovimentacaoForm } from '@/components/forms/MovimentacaoForm';

export function NovaEntradaPage() {
  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Nova entrada</h1>
        <p className="text-slate-500">Registre uma receita com rateio por categoria</p>
      </div>
      <MovimentacaoForm tipo="Entrada" />
    </div>
  );
}
