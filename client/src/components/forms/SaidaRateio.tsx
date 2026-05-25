import { useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface RateioRow {
  categoriaId: number;
  categoriaNome: string;
  valor: number;
}

interface Categoria {
  id: number;
  nome: string;
  grupo: string;
}

interface Props {
  categorias: Categoria[];
  rateios: RateioRow[];
  onChange: (rateios: RateioRow[]) => void;
  valorTotal: number;
}

export function SaidaRateio({ categorias, rateios, onChange, valorTotal }: Props) {
  const [busca, setBusca] = useState('');

  const usados = useMemo(() => new Set(rateios.map((r) => r.categoriaId)), [rateios]);

  const sugestoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q.length === 0) return [];
    return categorias
      .filter((c) => !usados.has(c.id))
      .filter((c) => c.nome.toLowerCase().includes(q) || c.grupo.toLowerCase().includes(q))
      .slice(0, 8);
  }, [busca, categorias, usados]);

  const soma = useMemo(() => rateios.reduce((acc, r) => acc + (r.valor || 0), 0), [rateios]);
  const diff = soma - valorTotal;
  const ok = Math.abs(diff) <= 0.01 && rateios.length > 0;

  function adicionar(c: Categoria) {
    onChange([...rateios, { categoriaId: c.id, categoriaNome: c.nome, valor: 0 }]);
    setBusca('');
  }

  function alterarValor(index: number, valor: number) {
    const next = rateios.slice();
    next[index] = { ...next[index], valor };
    onChange(next);
  }

  function remover(index: number) {
    onChange(rateios.filter((_, i) => i !== index));
  }

  function preencherUltimo() {
    if (rateios.length === 0) return;
    const outros = rateios.slice(0, -1).reduce((a, r) => a + r.valor, 0);
    alterarValor(rateios.length - 1, Math.max(0, +(valorTotal - outros).toFixed(2)));
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Buscar categoria por nome ou grupo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {sugestoes.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
            {sugestoes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => adicionar(c)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 border-b border-slate-100 last:border-0"
              >
                <Plus size={14} className="mt-0.5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{c.nome}</div>
                  <div className="text-xs text-slate-500">{c.grupo}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {rateios.length > 0 && (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide px-3 py-2">
                  Categoria
                </th>
                <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wide px-3 py-2 w-40">
                  Valor (R$)
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rateios.map((r, i) => (
                <tr key={r.categoriaId}>
                  <td className="px-3 py-2 text-slate-900">{r.categoriaNome}</td>
                  <td className="px-3 py-2">
                    <CurrencyInput
                      value={r.valor}
                      onChange={(v) => alterarValor(i, v)}
                      className="h-8"
                    />
                  </td>
                  <td className="px-2">
                    <button
                      type="button"
                      onClick={() => remover(i)}
                      className="p-1 hover:bg-red-50 rounded text-red-600"
                      aria-label="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot
              className={cn(
                'border-t border-slate-200',
                ok ? 'bg-green-50' : 'bg-amber-50',
              )}
            >
              <tr>
                <td className="px-3 py-2 text-sm font-medium">Total rateado</td>
                <td className="px-3 py-2 text-sm font-semibold text-right">{formatBRL(soma)}</td>
                <td className="px-2">
                  <button
                    type="button"
                    onClick={preencherUltimo}
                    className="text-xs text-slate-600 underline whitespace-nowrap"
                    title="Preencher último rateio com o restante"
                  >
                    auto
                  </button>
                </td>
              </tr>
              {!ok && (
                <tr>
                  <td colSpan={3} className="px-3 py-1 text-xs text-amber-700">
                    {diff > 0
                      ? `Excesso de ${formatBRL(diff)}`
                      : `Falta ${formatBRL(-diff)}`}{' '}
                    para fechar com o valor total ({formatBRL(valorTotal)}).
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}

      {rateios.length === 0 && (
        <div className="text-sm text-slate-500 p-4 border border-dashed border-slate-300 rounded-md text-center">
          Busque e adicione categorias acima para distribuir o valor.
        </div>
      )}
    </div>
  );
}

export function rateiosFechado(rateios: RateioRow[], valorTotal: number): boolean {
  if (rateios.length === 0) return false;
  const soma = rateios.reduce((a, r) => a + r.valor, 0);
  return Math.abs(soma - valorTotal) <= 0.01;
}
