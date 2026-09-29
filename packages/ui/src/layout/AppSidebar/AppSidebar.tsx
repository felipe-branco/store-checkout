'use client';

import React from 'react';
import Link from 'next/link';

const navItems = [
  { title: 'Home', href: '/' },
];

export function AppSidebar() {
  return (
    <aside className="ui-app-sidebar">
      <div className="ui-app-sidebar__brand">Store Checkout</div>
      <nav className="ui-app-sidebar__nav" aria-label="Main">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="ui-app-sidebar__link">
            {item.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
