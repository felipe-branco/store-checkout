'use client';

import React, { useState } from 'react';
import { AppHeader } from '../AppHeader/AppHeader';

export interface AppLayoutProps {
  sidebar: React.ReactNode;
  header?: {
    title: string;
    description?: string;
  };
  children: React.ReactNode;
}

export function AppLayout({ sidebar, header, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="ui-app-layout">
      {sidebarOpen ? sidebar : null}
      <div className="ui-app-main">
        {header ? (
          <AppHeader
            title={header.title}
            description={header.description}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
          />
        ) : null}
        <main className="ui-app-content">{children}</main>
      </div>
    </div>
  );
}
