# @store-checkout/ui integration

This package is a **UI skeleton**. It is not tied to MUI or Tailwind.

**Next step:** read [UI_STACK.md](./UI_STACK.md) and choose either the **MUI** or **Tailwind + shadcn** adoption path.

## Quick start (current skeleton)

The web app imports design tokens and skeleton styles in `apps/web-app/src/app/layout.tsx`:

```ts
import "@store-checkout/ui/tokens.css";
import "@store-checkout/ui/skeleton.css";
```

Slice and app code import components from `@store-checkout/ui` only:

```tsx
import { Button, Card, Typography, AppLayout } from "@store-checkout/ui";
```

## Fonts

Inter and JetBrains Mono are loaded in the Next.js root layout via `next/font/google`. CSS variables `--font-inter` and `--font-jetbrains-mono` are referenced in `tokens.css`.

## Theme

`ThemeProvider` toggles the `dark` class on `<html>`. Works with both MUI and shadcn when you adopt a stack (see UI_STACK.md).
