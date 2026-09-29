'use client';

import React from 'react';
import { Input } from '../Input/Input';

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
  const inputClass = [className].filter(Boolean).join(' ');

  return (
    <div className={`ui-textfield ${fullWidth ? 'ui-full-width' : ''}`.trim()}>
      {label ? (
        <label className="ui-textfield__label" htmlFor={fieldId}>
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
        <span className="ui-textfield__error" style={{ color: error ? undefined : 'var(--muted-foreground)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
