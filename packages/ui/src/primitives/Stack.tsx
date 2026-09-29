'use client';

import React from 'react';
import { Box, type BoxProps } from './Box';

export interface StackProps extends BoxProps {
  direction?: 'row' | 'column';
}

export function Stack({
  direction = 'column',
  className,
  ...rest
}: StackProps) {
  const classes = [
    'ui-stack',
    direction === 'column' ? 'ui-stack--column' : 'ui-stack--row',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <Box className={classes} {...rest} />;
}
