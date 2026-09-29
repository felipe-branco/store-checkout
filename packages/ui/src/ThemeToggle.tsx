'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from './lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'inline-flex size-14 items-center justify-center rounded-full border-2 border-border bg-card text-foreground transition-colors active:scale-95 active:bg-muted',
        className,
      )}
    >
      <Sun className="size-6 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-6 dark:block" aria-hidden="true" />
      <span className="sr-only">Toggle dark mode</span>
    </button>
  )
}
