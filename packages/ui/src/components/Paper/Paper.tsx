'use client';

import React from 'react';
import { Box, type BoxProps } from '../../primitives/Box';

export function Paper({ className, children, ...rest }: BoxProps) {
  const classes = ['ui-paper', className].filter(Boolean).join(' ');
  return (
    <Box className={classes} {...rest}>
      {children}
    </Box>
  );
}
