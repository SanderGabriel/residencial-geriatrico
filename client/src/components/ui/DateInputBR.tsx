import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface DateInputBRProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Valor no formato ISO "YYYY-MM-DD" ou string vazia. */
  value: string;
  /** Recebe ISO "YYYY-MM-DD" quando a data digitada é válida; "" se inválida ou vazia. */
  onChange: (iso: string) => void;
}

/** "2026-05-15" → "15/05/2026". String vazia se entrada inválida. */
export function isoToBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * "15/05/2026" → "2026-05-15". String vazia se incompleta ou inválida
 * (mês > 12, dia > 31, dia inválido pro mês, etc).
 */
export function brToISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return '';
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);
  if (mes < 1 || mes > 12) return '';
  if (dia < 1 || dia > 31) return '';
  if (ano < 1900 || ano > 2999) return '';
  // Verifica dia válido para o mês (mês usa base 0)
  const d = new Date(ano, mes - 1, dia, 12, 0, 0);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return '';
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Aplica a máscara DD/MM/AAAA conforme o usuário digita.
 * Mantém apenas dígitos (até 8), insere `/` nas posições 2 e 4.
 */
export function aplicarMascaraData(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Input de data no formato brasileiro DD/MM/AAAA.
 * Internamente armazena/emite ISO YYYY-MM-DD.
 *
 * - Auto-insere `/` ao digitar (15052026 → 15/05/2026).
 * - Aceita paste de "15/05/2026", "15052026", "15-05-2026" etc.
 * - Emite `""` enquanto incompleta/inválida; só emite ISO ao completar
 *   uma data válida. Forms devem desabilitar submit quando `value === ''`.
 */
export const DateInputBR = forwardRef<HTMLInputElement, DateInputBRProps>(function DateInputBR(
  { value, onChange, className, disabled, placeholder = 'DD/MM/AAAA', ...rest },
  ref,
) {
  const [text, setText] = useState<string>(() => isoToBR(value));

  // Sincroniza quando `value` muda externamente.
  useEffect(() => {
    const isoDoTexto = brToISO(text);
    if (isoDoTexto !== value) {
      setText(isoToBR(value));
    }
  }, [value, text]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novo = aplicarMascaraData(e.target.value);
    setText(novo);
    const iso = brToISO(novo);
    onChange(iso);
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={10}
      disabled={disabled}
      className={cn(
        'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums',
        'placeholder:text-slate-400',
        'focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
        'disabled:bg-slate-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
});
