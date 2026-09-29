'use client';

import React from 'react';

type TypographyVariant =
  | 'h1'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption';

type TypographyColor = 'primary' | 'secondary' | 'text.primary' | 'text.secondary';

const variantTag: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
  h1: 'h1',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
};

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  component?: React.ElementType;
  color?: TypographyColor;
  gutterBottom?: boolean;
}

export function Typography({
  variant = 'body1',
  component,
  color,
  gutterBottom,
  className,
  children,
  ...rest
}: TypographyProps) {
  const Component = component ?? variantTag[variant];
  const classes = [
    'ui-typography',
    `ui-typography--${variant === 'subtitle2' ? 'h6' : variant}`,
    color === 'text.secondary' || color === 'secondary' ? 'ui-typography--secondary' : '',
    gutterBottom ? 'ui-typography--gutter-bottom' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}
