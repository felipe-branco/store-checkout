'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_MODE_COOKIE = 'theme-mode';

function readSystemMode(): ResolvedThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveMode(mode: ThemeMode): ResolvedThemeMode {
  if (mode === 'system') return readSystemMode();
  return mode;
}

function applyDocumentClass(resolved: ResolvedThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function persistMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_MODE_COOKIE}=${mode};path=/;max-age=31536000;SameSite=Lax`;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return ctx;
}

export interface ThemeProviderProps {
  children: ReactNode;
  initialResolvedMode?: ResolvedThemeMode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({
  children,
  initialResolvedMode = 'light',
  defaultMode = 'light',
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>(initialResolvedMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persistMode(next);
    const resolved = resolveMode(next);
    setResolvedMode(resolved);
    applyDocumentClass(resolved);
  }, []);

  useEffect(() => {
    applyDocumentClass(resolvedMode);
  }, [resolvedMode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = readSystemMode();
      setResolvedMode(resolved);
      applyDocumentClass(resolved);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const value = useMemo(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
