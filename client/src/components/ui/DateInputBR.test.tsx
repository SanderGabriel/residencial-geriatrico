import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { aplicarMascaraData, brToISO, DateInputBR, isoToBR } from './DateInputBR';

/** Wrapper que simula o uso real (pai mantém estado). */
function ControlledDate({ onIsoChange }: { onIsoChange?: (iso: string) => void }) {
  const [iso, setIso] = useState('');
  return (
    <DateInputBR
      value={iso}
      onChange={(v) => {
        setIso(v);
        onIsoChange?.(v);
      }}
    />
  );
}

describe('isoToBR', () => {
  it('converte data válida', () => {
    expect(isoToBR('2026-05-15')).toBe('15/05/2026');
    expect(isoToBR('2026-01-01')).toBe('01/01/2026');
  });
  it('aceita ISO com hora', () => {
    expect(isoToBR('2026-05-15T18:30:00Z')).toBe('15/05/2026');
  });
  it('vazio => vazio', () => {
    expect(isoToBR('')).toBe('');
    expect(isoToBR(undefined as any)).toBe('');
  });
});

describe('brToISO', () => {
  it('converte data válida', () => {
    expect(brToISO('15/05/2026')).toBe('2026-05-15');
    expect(brToISO('01/01/2026')).toBe('2026-01-01');
    expect(brToISO('31/12/2026')).toBe('2026-12-31');
  });
  it('rejeita dia inválido', () => {
    expect(brToISO('32/05/2026')).toBe('');
    expect(brToISO('00/05/2026')).toBe('');
    expect(brToISO('30/02/2026')).toBe(''); // fevereiro não tem dia 30
    expect(brToISO('31/04/2026')).toBe(''); // abril tem 30 dias
  });
  it('rejeita mês inválido', () => {
    expect(brToISO('15/13/2026')).toBe('');
    expect(brToISO('15/00/2026')).toBe('');
  });
  it('rejeita ano fora do range', () => {
    expect(brToISO('15/05/1899')).toBe('');
    expect(brToISO('15/05/3000')).toBe('');
  });
  it('rejeita incompleto', () => {
    expect(brToISO('15/05')).toBe('');
    expect(brToISO('15/05/202')).toBe('');
    expect(brToISO('')).toBe('');
  });
});

describe('aplicarMascaraData', () => {
  it('insere barras automaticamente', () => {
    expect(aplicarMascaraData('1')).toBe('1');
    expect(aplicarMascaraData('15')).toBe('15');
    expect(aplicarMascaraData('150')).toBe('15/0');
    expect(aplicarMascaraData('1505')).toBe('15/05');
    expect(aplicarMascaraData('15052')).toBe('15/05/2');
    expect(aplicarMascaraData('15052026')).toBe('15/05/2026');
  });
  it('strip não-dígitos', () => {
    expect(aplicarMascaraData('15/05/2026')).toBe('15/05/2026');
    expect(aplicarMascaraData('15-05-2026')).toBe('15/05/2026');
    expect(aplicarMascaraData('abc15')).toBe('15');
  });
  it('limita a 8 dígitos', () => {
    expect(aplicarMascaraData('150520269999')).toBe('15/05/2026');
  });
  it('vazio => vazio', () => {
    expect(aplicarMascaraData('')).toBe('');
  });
});

describe('<DateInputBR>', () => {
  it('exibe valor ISO como DD/MM/AAAA', () => {
    render(<DateInputBR value="2026-05-15" onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('15/05/2026');
  });

  it('digitar 8 dígitos auto-formata e emite ISO', () => {
    const onIso = vi.fn();
    render(<ControlledDate onIsoChange={onIso} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15052026' } });
    expect(input.value).toBe('15/05/2026');
    expect(onIso).toHaveBeenLastCalledWith('2026-05-15');
  });

  it('emite "" enquanto incompleto', () => {
    const onIso = vi.fn();
    render(<ControlledDate onIsoChange={onIso} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15' } });
    expect(onIso).toHaveBeenLastCalledWith('');
    fireEvent.change(input, { target: { value: '1505' } });
    expect(onIso).toHaveBeenLastCalledWith('');
  });

  it('emite "" quando data inválida (32/13)', () => {
    const onIso = vi.fn();
    render(<ControlledDate onIsoChange={onIso} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '32132026' } });
    expect(onIso).toHaveBeenLastCalledWith('');
  });

  it('mostra placeholder DD/MM/AAAA quando vazio', () => {
    render(<DateInputBR value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('DD/MM/AAAA');
    expect(input).toBeInTheDocument();
  });
});
