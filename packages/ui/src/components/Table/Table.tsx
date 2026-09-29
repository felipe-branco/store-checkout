'use client';

import React from 'react';
import { type BoxProps } from '../../primitives/Box';

export function TableContainer({
  component: Component = 'div',
  className,
  children,
  ...rest
}: BoxProps & { component?: React.ElementType }) {
  const classes = ['ui-table-wrap', className].filter(Boolean).join(' ');
  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}

export function Table({ className, children, ...rest }: React.TableHTMLAttributes<HTMLTableElement>) {
  const classes = ['ui-table', className].filter(Boolean).join(' ');
  return (
    <table className={classes} {...rest}>
      {children}
    </table>
  );
}

export function TableHead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}

export function TableCell({
  component,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { component?: 'th' | 'td' }) {
  if (component === 'th') {
    return <th {...rest} />;
  }
  return <td {...rest} />;
}
