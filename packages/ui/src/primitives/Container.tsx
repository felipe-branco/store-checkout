'use client';

import React from 'react';
import { Box, type BoxProps } from './Box';

export interface ContainerProps extends BoxProps {
  maxWidth?: 'sm' | 'md' | 'lg' | false;
}

export function Container({
  maxWidth = 'lg',
  className,
  children,
  ...rest
}: ContainerProps) {
  const sizeClass =
    maxWidth === 'sm'
      ? 'ui-container--sm'
      : maxWidth === 'md'
        ? 'ui-container--md'
        : maxWidth === 'lg'
          ? 'ui-container--lg'
          : '';
  const classes = ['ui-container', sizeClass, className].filter(Boolean).join(' ');
  return (
    <Box className={classes} {...rest}>
      {children}
    </Box>
  );
}
