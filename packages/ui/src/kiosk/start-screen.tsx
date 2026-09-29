'use client'

import Image from 'next/image'
import { CreditCard, Hand, Nfc } from 'lucide-react'
import { ThemeToggle } from '../ThemeToggle'

const HERO_IMAGES = [
  '/products/hot-dog.png',
  '/products/batata.png',
  '/products/suco-laranja.png',
  '/products/sanduiche.png',
  '/products/refrigerante.png',
  '/products/brigadeiro.png',
]

const STEPS = ['Pick', 'Pay', 'Pick up at the counter']

export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <button
        type="button"
        onClick={onStart}
        className="flex flex-1 flex-col items-center justify-between gap-8 px-8 pt-16 pb-12 text-center outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label="Tap to start your order"
      >
        <header className="flex flex-col items-center gap-4">
          <p className="text-lg font-semibold tracking-[0.3em] text-muted-foreground uppercase">Self-checkout</p>
          <h1 className="font-display text-[clamp(6rem,22vw,11rem)] leading-none font-extrabold tracking-tighter text-foreground">
            STORE
          </h1>
          <p className="max-w-md text-2xl leading-relaxed text-pretty text-muted-foreground">
            Snacks, hot food and drinks. Order here, pick up at the counter.
          </p>
        </header>

        <div className="grid w-full max-w-xl grid-cols-3 gap-4" aria-hidden="true">
          {HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className={`relative aspect-square overflow-hidden rounded-3xl bg-card ${i % 2 === 0 ? 'rotate-[-3deg]' : 'rotate-[3deg]'}`}
            >
              <Image src={src} alt="" fill sizes="200px" className="object-cover" priority={i < 3} />
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col items-center gap-8">
          <span className="animate-kiosk-pulse flex w-full max-w-xl items-center justify-center gap-4 rounded-full bg-primary px-10 py-8 font-display text-4xl font-bold text-primary-foreground">
            <Hand className="size-10" aria-hidden="true" />
            Tap to start
          </span>

          <ol className="flex items-center gap-3 text-lg font-medium text-foreground">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {i + 1}
                </span>
                {step}
                {i < STEPS.length - 1 && <span className="h-0.5 w-6 bg-border" aria-hidden="true" />}
              </li>
            ))}
          </ol>

          <p className="flex items-center gap-3 text-base text-muted-foreground">
            <CreditCard className="size-5" aria-hidden="true" />
            Credit, debit, Apple Pay and Google Pay
            <Nfc className="size-5" aria-hidden="true" />
            <span className="font-semibold text-foreground">· Card only, no cash</span>
          </p>
        </div>
      </button>
    </main>
  )
}
