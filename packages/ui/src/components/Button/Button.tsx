'use client';

import React from 'react';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  component?: React.ElementType;
  href?: string;
}

export function Button({
  variant = 'default',
  component: Component = 'button',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'outline'
      ? 'ui-button--outline'
      : variant === 'secondary'
        ? 'ui-button--secondary'
        : variant === 'destructive'
          ? 'ui-button--destructive'
          : 'ui-button--default';

  const classes = ['ui-button', variantClass, className].filter(Boolean).join(' ');

  if (Component === 'button') {
    return <button type={type} className={classes} {...rest} />;
  }

  return <Component className={classes} {...rest} />;
}
