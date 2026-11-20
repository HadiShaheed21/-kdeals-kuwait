/**
 * Shopping cart utilities backed by localStorage.
 * Safe for server-side rendering (checks typeof window).
 */

export interface CartItem {
  productId: string
  variantId?: string
  name: string
  nameAr: string
  price: number
  quantity: number
  image: string
  attributes?: Record<string, string>
}

const CART_STORAGE_KEY = 'kdeals_cart'

/** Stable cart-line identity: same product/variant is one line; variants remain distinct. */
export function getCartLineId(item: Pick<CartItem, 'productId' | 'variantId'>): string {
  return `${encodeURIComponent(item.productId)}::${encodeURIComponent(item.variantId || 'default')}`
}

function normalizeImagePath(image: unknown): string {
  if (typeof image !== 'string') return '/images/product-hub.svg'
  const legacyAliases: Record<string, string> = {
    '/images/product-camera2.jpg': '/images/product-camera.svg',
    '/images/product-ultrabook.jpg': '/images/product-laptop.svg',
  }
  if (legacyAliases[image]) return legacyAliases[image]
  return image.startsWith('/images/product-') && image.endsWith('.jpg')
    ? image.replace(/\.jpg$/, '.svg')
    : image
}

function normalizeCart(rawItems: unknown): CartItem[] {
  if (!Array.isArray(rawItems)) return []

  const lines = new Map<string, CartItem>()
  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object') continue
    const item = rawItem as Partial<CartItem>
    if (typeof item.productId !== 'string' || !item.productId) continue

    const normalized: CartItem = {
      productId: item.productId,
      variantId: typeof item.variantId === 'string' && item.variantId ? item.variantId : undefined,
      name: typeof item.name === 'string' ? item.name : item.productId,
      nameAr: typeof item.nameAr === 'string' ? item.nameAr : item.productId,
      price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
      quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1,
      image: normalizeImagePath(item.image),
      attributes: item.attributes,
    }
    const lineId = getCartLineId(normalized)
    const existing = lines.get(lineId)
    if (existing) existing.quantity += normalized.quantity
    else lines.set(lineId, normalized)
  }
  return [...lines.values()]
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const normalized = normalizeCart(parsed)
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) saveCart(normalized)
    return normalized
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

export function addToCart(item: Omit<CartItem, 'quantity'> & { quantity?: number }): void {
  const items = getCart()
  const existing = items.find((line) => getCartLineId(line) === getCartLineId(item))
  if (existing) {
    existing.quantity += item.quantity || 1
  } else {
    items.push({ ...item, quantity: item.quantity || 1 })
  }
  saveCart(items)
}

export function removeFromCart(productId: string, variantId?: string): void {
  const items = getCart()
  const filtered = items.filter((item) => getCartLineId(item) !== getCartLineId({ productId, variantId }))
  saveCart(filtered)
}

export function updateQuantity(productId: string, variantId?: string, quantity?: number): void {
  const items = getCart()
  const item = items.find((line) => getCartLineId(line) === getCartLineId({ productId, variantId }))
  if (item) {
    item.quantity = Math.max(0, quantity ?? item.quantity)
    if (item.quantity === 0) {
      removeFromCart(productId, variantId)
    } else {
      saveCart(items)
    }
  }
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0)
}

export function getCartTotal(): number {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function clearCart(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_STORAGE_KEY)
}
