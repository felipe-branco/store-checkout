# UI stack adoption guide

`@em-slices/ui` ships as a **stack-agnostic skeleton**: layout shell, CSS design tokens, and minimal components so the monorepo compiles without MUI or Tailwind. Pick **one** stack below and implement components under the documented folders.

**Rule:** Slices and the web app import **`@em-slices/ui` only**. Do not import `@mui/*`, `lucide-react`, or app-local shadcn paths (`@/components/ui`) from slice UI code.

## Folder conventions (both paths)

```
packages/ui/src/
├── tokens/           # tokens.css + tokens.ts (keep)
├── styles/           # skeleton.css (replace or extend per stack)
├── primitives/       # Box, Stack, Typography, Container
├── components/       # Button, Card, Input, Alert, Table, …
├── layout/           # AppLayout, AppSidebar, AppHeader
├── ThemeProvider.tsx # dark class toggle (works with both stacks)
└── index.ts          # public barrel
```

Import styles in the app root layout:

```ts
import "@em-slices/ui/tokens.css";
import "@em-slices/ui/skeleton.css"; // remove when Tailwind/MUI styles replace it
```

---

## Path A: Material UI (MUI)

### 1. Dependencies

In `packages/ui/package.json`:

```json
"@mui/material": "7.x",
"@emotion/react": "^11",
"@emotion/styled": "^11",
"@mui/x-date-pickers": "7.x"  
```

Optional: `@mui/icons-material` or `lucide-react` (inside `packages/ui` only).

In `apps/web-app/package.json` (Emotion SSR for Next.js App Router):

```json
"@emotion/cache": "^11",
"@emotion/react": "^11"
```

### 2. Emotion SSR

Restore `apps/web-app/src/lib/emotion-registry.tsx` (see Next.js + MUI App Router docs). Wrap `ThemeProvider` in `providers.tsx`:

```tsx
<EmotionRegistry>
  <ThemeProvider …>
```

### 3. Theme

- Add `packages/ui/src/theme.ts` with `createTheme`, mapping [`tokens.css`](src/tokens/tokens.css) variables to MUI palette.
- Extend types in `theme.d.ts` if needed.
- Wire `MuiThemeProvider` inside `ThemeProvider.tsx` (or replace the stub).

### 4. Components

Replace skeleton implementations in `components/` and `primitives/` with MUI-backed versions. Keep the **same export names** from `index.ts` so slices and the generator keep working.

Use `sx` or styled APIs **only inside** `packages/ui`.

### 5. ESLint

Block `@mui/*` outside `packages/ui` (see `packages/eslint-config/no-mui-imports.mjs`).

---

## Path B: Tailwind CSS + shadcn/ui

### 1. Tailwind in the monorepo

- Add Tailwind v4 (or v3) to `apps/web-app` with PostCSS.
- Set `content` to include `packages/ui/src/**/*.{ts,tsx}` and `apps/web-app/src/**/*.{ts,tsx}`.
- Map [`tokens.css`](src/tokens/tokens.css) variables to shadcn theme keys in `apps/web-app/src/app/globals.css`.

### 2. shadcn in `packages/ui`

Recommended: initialize shadcn with components targeting `packages/ui/src/components/`.

```bash
cd packages/ui
npx shadcn@latest init
npx shadcn@latest add button card input alert table
```

Replace skeleton `Button`, `Card`, etc. with shadcn exports. Re-export from `index.ts` using the same names (`Button`, `Card`, `CardContent`, …).

### 3. Theme

- Keep `ThemeProvider` toggling `class="dark"` on `<html>`.
- shadcn uses CSS variables; align them with `tokens.css`.

### 4. Generator

Update `packages/em-slice-generator/src/templates/ui-component.template.ts` to use Tailwind `className` utilities instead of skeleton `ui-*` classes.

### 5. ESLint

- Block `@mui/*` in consumers (even if unused).
- Optional: block slices from importing `apps/web-app/**`.

---

## Comparison

| Concern | MUI | Tailwind + shadcn |
|---------|-----|-------------------|
| Theming | `createTheme` + Emotion | CSS variables + `dark` class |
| Layout | MUI `Box`, `Stack` | Tailwind flex/grid utilities or shadcn layout |
| Forms | MUI `TextField` | shadcn `Input`, `Form` |
| Tables | MUI `Table` | shadcn `Table` |
| Icons | MUI icons / Lucide in ui | Lucide (shadcn default) |
| Next.js SSR | Emotion registry required | Standard CSS |

---

## Generator and slices

After choosing a stack:

1. Update generated UI to match (MUI `sx` vs Tailwind classes).
2. Add to [`POST_GENERATION_CHECKLIST.md`](../em-slice-generator/POST_GENERATION_CHECKLIST.md): slice UI imports `@em-slices/ui` only.
3. Prefer **custom components** (`Button`, `Card`, `Input`) over raw primitives in slice UI.

---

## Skeleton API (until you adopt a stack)

| Export | Purpose |
|--------|---------|
| `AppLayout`, `AppSidebar`, `AppHeader` | App shell |
| `ThemeProvider`, `useThemeMode` | Light/dark via `.dark` on `<html>` |
| `Box`, `Stack`, `Typography`, `Container` | Layout primitives |
| `Button`, `Card`, `Alert`, `TextField`, `Paper`, `Table*` | Minimal styled stubs |
| `@em-slices/ui/tokens.css` | Design tokens |
| `@em-slices/ui/skeleton.css` | Skeleton component styles |

Replace stubs when following Path A or Path B above.
