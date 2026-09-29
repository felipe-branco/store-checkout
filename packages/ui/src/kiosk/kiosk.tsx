'use client'

import { useState } from 'react'
import { OrderScreen } from './order-screen'
import { StartScreen } from './start-screen'
import { useProducts } from '../hooks/use-products'

export function Kiosk() {
  const [screen, setScreen] = useState<'start' | 'order'>('start')
  const [sessionId, setSessionId] = useState(0)
  // Warm the menu cache while the start screen is showing so the first tap is instant.
  const { mutate } = useProducts()

  function resetSession() {
    setSessionId((id) => id + 1)
    setScreen('start')
    mutate()
  }

  if (screen === 'start') return <StartScreen onStart={() => setScreen('order')} />
  return <OrderScreen key={sessionId} onExit={resetSession} />
}
