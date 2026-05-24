import { MovimentacaoForm } from '@/components/forms/MovimentacaoForm';

export function NovaSaidaPage() {
  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Nova saída</h1>
        <p className="text-slate-500">Registre uma despesa com rateio por categoria</p>
      </div>
      <MovimentacaoForm tipo="Saída" />
    </div>
  );
}
