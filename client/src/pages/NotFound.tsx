import { Link } from 'wouter';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto py-12 text-center space-y-4">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="text-slate-500">A rota acessada não existe.</p>
      <Link href="/">
        <Button>Ir para o início</Button>
      </Link>
    </div>
  );
}
