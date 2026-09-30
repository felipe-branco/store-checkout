'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground',
        className
      )}
      {...rest}
    />
  );
}
