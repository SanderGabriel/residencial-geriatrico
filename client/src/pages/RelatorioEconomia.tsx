import { Placeholder } from './Placeholder';

export function RelatorioEconomiaPage() {
  return (
    <Placeholder
      titulo="Relatório de Economia"
      descricao="Análise de margens por linha, período e unidade"
      proxima="Requer agregações backend (SUM por natureza, por linha de margem) e biblioteca de gráficos (recharts). Mover para Phase 2 — o cálculo está claro mas a entrega vai além do escopo desta sessão."
    />
  );
}
