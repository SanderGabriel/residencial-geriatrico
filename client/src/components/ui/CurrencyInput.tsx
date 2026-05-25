import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Valor em reais (ex: 1234.56). undefined/0 mostra "R$ 0,00". */
  value: number | undefined;
  /** Recebe valor em reais (sempre número finito, mínimo 0). */
  onChange: (valor: number) => void;
  /** Permite valor negativo. Padrão false. */
  allowNegative?: boolean;
}

const brFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata um número de reais (1234.56) em "R$ 1.234,56". */
export function formatCurrency(reais: number): string {
  if (!Number.isFinite(reais)) return brFormatter.format(0);
  return brFormatter.format(reais);
}

/**
 * Pega o texto exibido e converte para reais.
 * Lê apenas dígitos e trata como centavos. Ignora R$, pontos, vírgulas e
 * qualquer caractere não-numérico.
 */
export function parseCurrencyInput(text: string, allowNegative = false): number {
  const negativo = allowNegative && text.includes('-');
  const digits = text.replace(/\D/g, '');
  if (digits === '') return 0;
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return negativo ? -reais : reais;
}

/**
 * Input de moeda BRL com padrão "acumulador de centavos":
 * - Você digita 1, 2, 3, 4, 5, 6 e o display vai virando R$ 0,01 → R$ 0,12
 *   → R$ 1,23 → R$ 12,34 → R$ 123,45 → R$ 1.234,56.
 * - Backspace remove o último centavo digitado.
 * - Paste de "1.234,56" ou "1234.56" ou "1234,56" funciona igual.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { value, onChange, allowNegative = false, className, disabled, ...rest },
  ref,
) {
  // Texto exibido no input (sempre formatado).
  const [text, setText] = useState<string>(() => formatCurrency(value ?? 0));

  // Mantém o texto sincronizado quando o `value` muda externamente
  // (mas evita reformatar enquanto o usuário digita: comparamos pelo valor
  // parseado, não pelo texto bruto).
  useEffect(() => {
    const parsedDoTexto = parseCurrencyInput(text, allowNegative);
    if (Math.abs(parsedDoTexto - (value ?? 0)) > 0.001) {
      setText(formatCurrency(value ?? 0));
    }
  }, [value, allowNegative, text]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const reais = parseCurrencyInput(e.target.value, allowNegative);
    setText(formatCurrency(reais));
    onChange(reais);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    // Posiciona o cursor no fim ao focar.
    requestAnimationFrame(() => {
      const len = e.target.value.length;
      e.target.setSelectionRange(len, len);
    });
    rest.onFocus?.(e);
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      disabled={disabled}
      className={cn(
        'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-right tabular-nums',
        'placeholder:text-slate-400',
        'focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
        'disabled:bg-slate-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
});
