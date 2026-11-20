/**
 * Wishlist utilities backed by localStorage.
 * Safe for server-side rendering (checks typeof window).
 */

const WISHLIST_STORAGE_KEY = 'kdeals_wishlist'

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveWishlist(ids: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids))
}

export function addToWishlist(productId: string): void {
  const ids = getWishlist()
  if (!ids.includes(productId)) {
    ids.push(productId)
    saveWishlist(ids)
  }
}

export function removeFromWishlist(productId: string): void {
  const ids = getWishlist().filter((id) => id !== productId)
  saveWishlist(ids)
}

export function isInWishlist(productId: string): boolean {
  return getWishlist().includes(productId)
}

export function getWishlistCount(): number {
  return getWishlist().length
}

export function toggleWishlist(productId: string): void {
  if (isInWishlist(productId)) {
    removeFromWishlist(productId)
  } else {
    addToWishlist(productId)
  }
}
