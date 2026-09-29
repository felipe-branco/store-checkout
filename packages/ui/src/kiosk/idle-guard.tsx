'use client'

import { useEffect, useState } from 'react'
import { useEffectEvent } from '../hooks/use-effect-event'
import { Button } from '../components/shadcn/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../components/shadcn/alert-dialog'

const IDLE_MS = 60_000
const PROMPT_SECONDS = 20

interface IdleGuardProps {
  active: boolean
  hasItems: boolean
  onTimeout: () => void
}

/**
 * Walk-away protection: if the customer leaves mid-order, the next person
 * shouldn't inherit their cart. Empty sessions reset silently.
 */
export function IdleGuard({ active, hasItems, onTimeout }: IdleGuardProps) {
  const [prompting, setPrompting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(PROMPT_SECONDS)

  const timeout = useEffectEvent(() => onTimeout())
  const handleIdle = useEffectEvent(() => {
    if (!hasItems) {
      onTimeout()
      return
    }
    setSecondsLeft(PROMPT_SECONDS)
    setPrompting(true)
  })

  useEffect(() => {
    if (!active || prompting) return
    let timer = setTimeout(handleIdle, IDLE_MS)
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(handleIdle, IDLE_MS)
    }
    const events = ['pointerdown', 'keydown'] as const
    events.forEach((e) => window.addEventListener(e, reset))
    window.addEventListener('scroll', reset, true)
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
      window.removeEventListener('scroll', reset, true)
    }
  }, [active, prompting])

  useEffect(() => {
    if (!prompting) return
    if (secondsLeft <= 0) {
      timeout()
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [prompting, secondsLeft])

  return (
    <AlertDialog open={prompting} onOpenChange={(open) => !open && setPrompting(false)}>
      <AlertDialogContent className="flex max-w-lg flex-col items-center gap-6 rounded-4xl p-10 text-center data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
        <div
          className="flex size-32 items-center justify-center rounded-full border-8 border-primary font-display text-6xl font-extrabold tabular-nums"
          aria-hidden="true"
        >
          {secondsLeft}
        </div>
        <AlertDialogTitle className="font-display text-4xl font-bold">Still there?</AlertDialogTitle>
        <AlertDialogDescription className="text-xl leading-relaxed text-muted-foreground">
          {"For your privacy, we'll cancel this order in "}
          {secondsLeft} seconds unless someone taps the screen.
        </AlertDialogDescription>
        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={() => setPrompting(false)}
            className="h-20 rounded-full font-display text-2xl font-bold"
            autoFocus
          >
            {"Yes, I'm still ordering"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPrompting(false)
              timeout()
            }}
            className="h-16 rounded-full text-lg font-semibold text-muted-foreground"
          >
            Cancel and exit
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
