const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return brlFormatter.format(0);
  const n = typeof valor === 'string' ? parseFloat(valor) : valor;
  return brlFormatter.format(Number.isFinite(n) ? n : 0);
}

/**
 * Formata uma string YYYY-MM-DD ou Date para DD/MM/AAAA, mantendo timezone local.
 * Não usa toISOString() para evitar problemas de fuso.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [y, m, d] = date.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR');
}

/** Converte string ou number BRL em float. Aceita "1.234,56" ou "1234.56" ou número. */
export function parseBRL(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  const cleaned = valor.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Mês atual no formato MM/AAAA. */
export function competenciaAtual(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${mm}/${date.getFullYear()}`;
}

/** Data hoje em YYYY-MM-DD (timezone local). */
export function hojeISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
