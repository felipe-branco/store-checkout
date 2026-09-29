import { cookies, headers } from 'next/headers';

export type ResolvedThemeMode = 'light' | 'dark';

const THEME_MODE_COOKIE = 'theme-mode';

export async function getInitialResolvedMode(): Promise<ResolvedThemeMode> {
  const cookieStore = await cookies();
  const themeMode = cookieStore.get(THEME_MODE_COOKIE)?.value;
  if (themeMode === 'dark' || themeMode === 'light') {
    return themeMode;
  }

  const headersList = await headers();
  const prefersColorScheme = headersList.get('sec-ch-prefers-color-scheme');
  if (prefersColorScheme === 'dark') return 'dark';
  if (prefersColorScheme === 'light') return 'light';

  return 'light';
}
