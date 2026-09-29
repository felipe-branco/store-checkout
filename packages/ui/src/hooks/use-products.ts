'use client'

import useSWR from 'swr'
import type { Product } from '../lib/kiosk-types'

async function fetcher(url: string): Promise<Product[]> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Falha ao carregar o cardápio')
  return res.json()
}

export function useProducts() {
  return useSWR('/api/products', fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
}
