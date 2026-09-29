"use client";

import { useCallback, useRef, useInsertionEffect } from "react";

/**
 * Stable callback for effects (React `useEffectEvent` polyfill — not in React 19.1 stable yet).
 *
 * @deprecated Remove after React/Next upgrade — see tasks/todo.md (Backlog).
 */
export function useEffectEvent<Args extends unknown[], Return>(
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  const ref = useRef(fn);
  useInsertionEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}
