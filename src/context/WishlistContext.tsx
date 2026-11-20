'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  getWishlist, addToWishlist, removeFromWishlist,
  getWishlistCount, toggleWishlist,
} from '@/lib/wishlist'

interface WishlistContextType {
  ids: string[]
  count: number
  add: (productId: string) => void
  remove: (productId: string) => void
  toggle: (productId: string) => void
  isIn: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  // Keep the server and initial browser render identical; localStorage is restored after hydration.
  const [ids, setIds] = useState<string[]>([])
  const [count, setCount] = useState(0)

  const syncFromStorage = useCallback(() => {
    const storedIds = getWishlist()
    setIds(storedIds)
    setCount(getWishlistCount())
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(syncFromStorage)
    return () => window.cancelAnimationFrame(frame)
  }, [syncFromStorage])

  const add = useCallback((productId: string) => {
    addToWishlist(productId)
    syncFromStorage()
  }, [syncFromStorage])

  const remove = useCallback((productId: string) => {
    removeFromWishlist(productId)
    syncFromStorage()
  }, [syncFromStorage])

  const toggle = useCallback((productId: string) => {
    toggleWishlist(productId)
    syncFromStorage()
  }, [syncFromStorage])

  const isIn = useCallback((productId: string) => {
    return ids.includes(productId)
  }, [ids])

  return (
    <WishlistContext.Provider value={{ ids, count, add, remove, toggle, isIn }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider')
  return context
}
