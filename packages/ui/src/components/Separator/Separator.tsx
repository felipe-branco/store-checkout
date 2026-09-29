'use client';

import React from 'react';

export function Separator({ className, ...rest }: React.HTMLAttributes<HTMLHRElement>) {
  const classes = ['ui-separator', className].filter(Boolean).join(' ');
  return <hr className={classes} {...rest} />;
}
