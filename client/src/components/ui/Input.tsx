import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm',
          'placeholder:text-slate-400',
          'focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
          'disabled:bg-slate-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm',
          'placeholder:text-slate-400',
          'focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm',
          'focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
          'disabled:bg-slate-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Label({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
