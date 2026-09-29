'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type AlertSeverity = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  severity?: AlertSeverity;
}

const severityClass: Record<AlertSeverity, string> = {
  success: 'border-success/30 bg-success/10 text-foreground',
  warning: 'border-warning/40 bg-warning/10 text-foreground',
  error: 'border-destructive/40 bg-destructive/10 text-foreground',
  info: 'border-border bg-muted text-foreground',
};

export function Alert({
  severity = 'info',
  className,
  children,
  role = 'alert',
  ...rest
}: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 px-4 py-3 text-sm',
        severityClass[severity],
        className
      )}
      role={role}
      {...rest}
    >
      {children}
    </div>
  );
}
