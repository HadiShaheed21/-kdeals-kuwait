'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  getCart, addToCart, removeFromCart, updateQuantity,
  getCartCount, getCartTotal, clearCart,
} from '@/lib/cart'
import type { CartItem } from '@/lib/cart'

interface CartContextType {
  items: CartItem[]
  count: number
  total: number
  add: (item: CartItem) => void
  remove: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  // Keep the server and initial browser render identical; localStorage is restored after hydration.
  const [items, setItems] = useState<CartItem[]>([])
  const [count, setCount] = useState(0)
  const [total, setTotal] = useState(0)

  const syncFromStorage = useCallback(() => {
    setItems(getCart())
    setCount(getCartCount())
    setTotal(getCartTotal())
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(syncFromStorage)
    return () => window.cancelAnimationFrame(frame)
  }, [syncFromStorage])

  const add = useCallback((item: CartItem) => {
    addToCart(item)
    syncFromStorage()
  }, [syncFromStorage])

  const remove = useCallback((productId: string, variantId?: string) => {
    removeFromCart(productId, variantId)
    syncFromStorage()
  }, [syncFromStorage])

  const updateQty = useCallback((productId: string, variantId: string | undefined, quantity: number) => {
    updateQuantity(productId, variantId, quantity)
    syncFromStorage()
  }, [syncFromStorage])

  const clear = useCallback(() => {
    clearCart()
    setItems([])
    setCount(0)
    setTotal(0)
  }, [])

  return (
    <CartContext.Provider value={{ items, count, total, add, remove, updateQuantity: updateQty, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
