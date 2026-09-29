'use client';

import React from 'react';

export type AlertSeverity = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  severity?: AlertSeverity;
}

export function Alert({
  severity = 'info',
  className,
  children,
  role = 'alert',
  ...rest
}: AlertProps) {
  const classes = ['ui-alert', `ui-alert--${severity}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} role={role} {...rest}>
      {children}
    </div>
  );
}
