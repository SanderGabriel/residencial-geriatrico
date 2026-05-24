import { Card, CardContent } from '@/components/ui/Card';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

interface Props {
  titulo: string;
  descricao?: string;
  proxima?: string;
}

export function Placeholder({ titulo, descricao, proxima }: Props) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft size={14} /> Voltar
      </Link>
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          {descricao && <p className="text-slate-500">{descricao}</p>}
          <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
            Em construção · Phase 2 do roadmap
          </div>
          {proxima && (
            <p className="text-sm text-slate-600 max-w-md mx-auto pt-2">{proxima}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
