import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { CurrencyInput, formatCurrency, parseCurrencyInput } from './CurrencyInput';

describe('formatCurrency', () => {
  it('formata valores comuns', () => {
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
    expect(formatCurrency(1)).toMatch(/R\$\s*1,00/);
    expect(formatCurrency(0.5)).toMatch(/R\$\s*0,50/);
    expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/);
    expect(formatCurrency(1000000)).toMatch(/R\$\s*1\.000\.000,00/);
  });
  it('NaN/Infinity => R$ 0,00', () => {
    expect(formatCurrency(NaN)).toMatch(/0,00/);
    expect(formatCurrency(Infinity)).toMatch(/0,00/);
  });
});

describe('parseCurrencyInput', () => {
  it('texto vazio => 0', () => {
    expect(parseCurrencyInput('')).toBe(0);
    expect(parseCurrencyInput('R$ ')).toBe(0);
  });
  it('acumulador de centavos: 123 => 1.23', () => {
    expect(parseCurrencyInput('123')).toBeCloseTo(1.23, 2);
  });
  it('1 dígito => 0.01', () => {
    expect(parseCurrencyInput('1')).toBeCloseTo(0.01, 2);
  });
  it('R$ 1.234,56 => 1234.56', () => {
    expect(parseCurrencyInput('R$ 1.234,56')).toBeCloseTo(1234.56, 2);
  });
  it('paste de 1234.56 (formato US) => 123456 cents = 1234.56', () => {
    expect(parseCurrencyInput('1234.56')).toBeCloseTo(1234.56, 2);
  });
  it('ignora letras e símbolos', () => {
    expect(parseCurrencyInput('abc12d34')).toBeCloseTo(12.34, 2);
  });
  it('negativos opcionalmente', () => {
    expect(parseCurrencyInput('-100', false)).toBeCloseTo(1, 2);
    expect(parseCurrencyInput('-100', true)).toBeCloseTo(-1, 2);
  });
});

describe('<CurrencyInput>', () => {
  it('renderiza com valor formatado', () => {
    render(<CurrencyInput value={1234.56} onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/1\.234,56/);
  });

  it('renderiza 0 como R$ 0,00 quando undefined', () => {
    render(<CurrencyInput value={undefined} onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/0,00/);
  });

  it('digitar dígito chama onChange com cents/100', () => {
    const onChange = vi.fn();
    render(<CurrencyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'R$ 0,005' } }); // simula digitar "5"
    expect(onChange).toHaveBeenLastCalledWith(0.05);
  });

  it('digitar vários dígitos acumula', () => {
    const onChange = vi.fn();
    render(<CurrencyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12345' } });
    expect(onChange).toHaveBeenLastCalledWith(123.45);
  });

  it('aceita paste formatado', () => {
    const onChange = vi.fn();
    render(<CurrencyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'R$ 9.999,99' } });
    expect(onChange).toHaveBeenLastCalledWith(9999.99);
  });

  it('valor externo atualizado é refletido no display', () => {
    const { rerender } = render(<CurrencyInput value={100} onChange={() => {}} />);
    let input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/100,00/);
    rerender(<CurrencyInput value={250.75} onChange={() => {}} />);
    input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/250,75/);
  });
});
