'use client';

import React from 'react';

export interface AppHeaderProps {
  title: string;
  description?: string;
  onToggleSidebar?: () => void;
}

export function AppHeader({ title, description, onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="ui-app-header">
      {onToggleSidebar ? (
        <button
          type="button"
          className="ui-app-header__toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
      <div>
        <h1 className="ui-app-header__title">{title}</h1>
        {description ? <p className="ui-app-header__description">{description}</p> : null}
      </div>
    </header>
  );
}
