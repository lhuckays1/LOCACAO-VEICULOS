import React from 'react';
import { cn } from './Button';
import { handleUppercaseInput } from '../../utils/formatters';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  autoUppercase?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      icon,
      type = 'text',
      autoUppercase = true,
      onChange,
      onValueChange,
      name,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      // Transform to uppercase unless excluded or explicit flag set to false
      if (
        autoUppercase &&
        type !== 'password' &&
        type !== 'email' &&
        name !== 'email' &&
        name !== 'password' &&
        name !== 'confirmPassword' &&
        name !== 'url'
      ) {
        val = handleUppercaseInput(name || '', val);
        e.target.value = val;
      }

      if (onChange) {
        onChange(e);
      }
      if (onValueChange) {
        onValueChange(val);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-xs">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            className={cn(
              'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
              icon ? 'pl-9' : 'pl-3',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 hover:border-slate-400',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
