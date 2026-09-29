'use client';

import React from 'react';
import { Box, type BoxProps } from '../../primitives/Box';

export function Card({ className, children, ...rest }: BoxProps) {
  const classes = ['ui-card', className].filter(Boolean).join(' ');
  return (
    <Box component="article" className={classes} {...rest}>
      {children}
    </Box>
  );
}

export function CardHeader({ className, children, ...rest }: BoxProps) {
  return (
    <Box className={className} style={{ padding: 'var(--spacing-4) var(--spacing-4) 0' }} {...rest}>
      {children}
    </Box>
  );
}

export function CardTitle({ className, children, ...rest }: BoxProps) {
  return (
    <Box
      component="h3"
      className={className}
      style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function CardDescription({ className, children, ...rest }: BoxProps) {
  return (
    <Box
      className={className}
      style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function CardContent({ className, children, ...rest }: BoxProps) {
  const classes = ['ui-card__content', className].filter(Boolean).join(' ');
  return (
    <Box className={classes} {...rest}>
      {children}
    </Box>
  );
}

export function CardFooter({ className, children, ...rest }: BoxProps) {
  return (
    <Box className={className} style={{ padding: '0 var(--spacing-4) var(--spacing-4)' }} {...rest}>
      {children}
    </Box>
  );
}

export function CardAction({ className, children, ...rest }: BoxProps) {
  return (
    <Box className={className} style={{ padding: 'var(--spacing-4)' }} {...rest}>
      {children}
    </Box>
  );
}
