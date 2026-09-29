'use client';

import React from 'react';
import Link from 'next/link';

const navItems = [
  { title: 'Início', href: '/' },
];

export function AppSidebar() {
  return (
    <aside className="ui-app-sidebar">
      <div className="ui-app-sidebar__brand">EM Slices</div>
      <nav className="ui-app-sidebar__nav" aria-label="Principal">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="ui-app-sidebar__link">
            {item.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
