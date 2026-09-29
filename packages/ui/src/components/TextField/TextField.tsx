'use client';

import React from 'react';
import { Input } from '../Input/Input';
import { cn } from '../../lib/utils';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
}

export function TextField({
  label,
  error,
  helperText,
  fullWidth,
  multiline,
  rows = 3,
  className,
  id,
  ...rest
}: TextFieldProps) {
  const fieldId = id ?? rest.name;
  const inputClass = cn(
    error && 'border-destructive focus-visible:ring-destructive/30',
    className
  );

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth !== false && 'w-full')}>
      {label ? (
        <label className="text-sm font-medium text-foreground" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      {multiline ? (
        <textarea
          id={fieldId}
          className={inputClass}
          rows={rows}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <Input id={fieldId} className={inputClass} aria-invalid={error || undefined} {...rest} />
      )}
      {helperText ? (
        <span className={cn('text-sm', error ? 'text-destructive' : 'text-muted-foreground')}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
