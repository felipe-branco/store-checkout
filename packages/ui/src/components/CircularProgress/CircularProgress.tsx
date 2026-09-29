'use client';

import React from 'react';

export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function CircularProgress({
  size = 20,
  className,
  ...rest
}: CircularProgressProps) {
  const classes = ['ui-spinner', className].filter(Boolean).join(' ');
  return (
    <div
      className={classes}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Carregando"
      {...rest}
    />
  );
}
