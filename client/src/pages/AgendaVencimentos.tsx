import { useMemo, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label, Select } from '@/components/ui/Input';
import { trpc } from '@/lib/trpc';
import { formatBRL, formatDate, hojeISO } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tipo = 'Pagar' | 'Receber' | '';
type Faixa = 'vencidos' | 'proximos7' | 'proximos30' | 'futuros';

/**
 * Calcula faixa relativa a hoje:
 * - vencidos: vencimento < hoje
 * - proximos7: 0..7 dias
 * - proximos30: 8..30 dias
 * - futuros: > 30 dias
 */
export function calcularFaixa(vencimento: string, hoje: string = hojeISO()): Faixa {
  // YYYY-MM-DD compara lexicograficamente
  if (vencimento < hoje) return 'vencidos';
  const dias = diasAteVencimento(vencimento, hoje);
  if (dias <= 7) return 'proximos7';
  if (dias <= 30) return 'proximos30';
  return 'futuros';
}

export function diasAteVencimento(vencimento: string, hoje: string = hojeISO()): number {
  const [y1, m1, d1] = vencimento.slice(0, 10).split('-').map(Number);
  const [y2, m2, d2] = hoje.slice(0, 10).split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

const FAIXAS: { id: Faixa; label: string; cor: string; icon: typeof AlertTriangle }[] = [
  { id: 'vencidos', label: 'Vencidos', cor: 'text-red-700 bg-red-50 border-red-200', icon: AlertTriangle },
  { id: 'proximos7', label: 'Próximos 7 dias', cor: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  { id: 'proximos30', label: 'Próximos 30 dias', cor: 'text-blue-700 bg-blue-50 border-blue-200', icon: Clock },
  { id: 'futuros', label: 'Futuros', cor: 'text-slate-700 bg-slate-50 border-slate-200', icon: CheckCircle2 },
];

export function AgendaVencimentosPage() {
  const [tipo, setTipo] = useState<Tipo>('');

  const listQ = trpc.titulos.list.useQuery({
    tipo: tipo || undefined,
    pagination: { page: 1, pageSize: 200 },
  });

  const itensRelevantes = useMemo(() => {
    const all = listQ.data?.items ?? [];
    // Mostra só ainda-em-aberto (não Pago/Recebido/Cancelado)
    return all
      .filter((t) => t.status !== 'Pago' && t.status !== 'Recebido' && t.status !== 'Cancelado')
      .map((t) => ({
        ...t,
        faixa: calcularFaixa(t.dataVencimento),
        dias: diasAteVencimento(t.dataVencimento),
      }));
  }, [listQ.data]);

  const porFaixa = useMemo(() => {
    const grupos: Record<Faixa, typeof itensRelevantes> = {
      vencidos: [],
      proximos7: [],
      proximos30: [],
      futuros: [],
    };
    for (const it of itensRelevantes) grupos[it.faixa].push(it);
    // ordena cada grupo por data
    for (const k of Object.keys(grupos) as Faixa[]) {
      grupos[k].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
    }
    return grupos;
  }, [itensRelevantes]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Agenda de vencimentos</h1>
        <p className="text-slate-500">Títulos em aberto agrupados por proximidade</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="max-w-xs">
            <Label>Tipo</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
              <option value="">Todos</option>
              <option value="Pagar">Apenas a Pagar</option>
              <option value="Receber">Apenas a Receber</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {listQ.isLoading ? (
        <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
      ) : (
        FAIXAS.map((f) => {
          const items = porFaixa[f.id];
          const Icon = f.icon;
          return (
            <Card key={f.id}>
              <CardHeader>
                <CardTitle className={cn('flex items-center gap-2', f.cor.split(' ').find((c) => c.startsWith('text-')))}>
                  <Icon size={18} />
                  {f.label}
                  <span className="ml-auto text-sm font-normal text-slate-500">
                    {items.length} {items.length === 1 ? 'título' : 'títulos'} · total{' '}
                    {formatBRL(items.reduce((a, t) => a + Number(t.saldoEmAberto ?? 0), 0))}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-slate-500">Nada nesta faixa.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {items.map((t) => (
                      <li
                        key={t.id}
                        className={cn(
                          'py-2 flex items-center justify-between gap-3 border-l-4 pl-3',
                          f.cor.split(' ').find((c) => c.startsWith('border-')) ?? 'border-slate-200',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{t.descricao}</div>
                          <div className="text-xs text-slate-500">
                            {t.tipo === 'Pagar' ? 'A pagar' : 'A receber'} ·{' '}
                            {formatDate(t.dataVencimento)} ·{' '}
                            {t.dias < 0
                              ? `${Math.abs(t.dias)} dia(s) em atraso`
                              : t.dias === 0
                              ? 'vence hoje'
                              : `em ${t.dias} dia(s)`}
                          </div>
                        </div>
                        <div className="text-right font-medium text-sm whitespace-nowrap">
                          {formatBRL(t.saldoEmAberto)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
