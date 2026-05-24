import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  CreditCard,
  Coins,
  CalendarClock,
  LineChart,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/nova-saida', label: 'Nova Saída', icon: ArrowDownCircle },
  { href: '/nova-entrada', label: 'Nova Entrada', icon: ArrowUpCircle },
  { href: '/extrato', label: 'Extrato', icon: Receipt },
  { href: '/titulos-pagar', label: 'Títulos a Pagar', icon: CreditCard },
  { href: '/titulos-receber', label: 'Títulos a Receber', icon: Coins },
  { href: '/agenda', label: 'Agenda', icon: CalendarClock },
  { href: '/economia', label: 'Relatório', icon: LineChart },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-white border-r border-slate-200 transition-transform md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <div className="font-semibold text-slate-900">Novo Lar</div>
          <button
            className="md:hidden p-1 hover:bg-slate-100 rounded"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100',
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          Grupo Novo Lar · Phase 1
        </div>
      </aside>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col">
        <header className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white md:hidden">
          <button
            className="p-1 hover:bg-slate-100 rounded"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="font-semibold">Novo Lar</div>
          <div className="w-8" />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
