'use client';

import React from 'react';

export interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  component?: React.ElementType;
}

export function Box({
  component: Component = 'div',
  className,
  style,
  children,
  ...rest
}: BoxProps) {
  const classes = ['ui-box', className].filter(Boolean).join(' ');
  return (
    <Component className={classes} style={style} {...rest}>
      {children}
    </Component>
  );
}
