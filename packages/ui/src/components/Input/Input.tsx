'use client';

import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  const classes = ['ui-input', className].filter(Boolean).join(' ');
  return <input className={classes} {...rest} />;
}
