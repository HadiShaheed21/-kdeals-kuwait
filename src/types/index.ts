/** Core product types */
export interface Product {
  id: string;
  slug: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  priceKwd: number;
  compareAtPriceKwd?: number;
  stock: number;
  sku?: string;
  weightKg?: number;
  dimensionsCm?: Record<string, number>;
  images: { url: string; alt?: string; sortOrder: number; isMain: boolean }[];
  status: 'active' | 'pending' | 'archived';
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Product variant (electronics size/colour/storage) */
export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  priceKwd: number;
  stock: number;
  attributes: Record<string, string>;
}

/** Category */
export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  parentId: string | null;
  icon?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Homepage banner */
export interface Banner {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  imageUrl: string;
  linkUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

/** Flash sale / offer */
export interface Offer {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  imageUrl?: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

/** Delivery area (Kuwait governorates) */
export interface DeliveryArea {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  shippingFeeKwd: number;
  estimatedDays: number;
  isActive: boolean;
}

/** Delivery / store settings */
export interface DeliverySettings {
  id: string;
  storeNameEn: string;
  storeNameAr: string;
  shippingFeeKwd: number;
  minOrderKwd: number;
  maxOrderKwd: number | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Admin settings (WhatsApp number, contact, meta) */
export interface Setting {
  id: string;
  key: string;
  value: string;
  label?: string;
}

/** Orders */
export interface Order {
  id: string;
  userId: string | null;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  totalKwd: number;
  deliveryFeeKwd: number;
  discountKwd: number;
  finalTotalKwd: number;
  shippingAddress: string;
  notes?: string;
  whatsappNumber: string;
  createdAt: string;
}

/** Order items */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  variantId: string | null;
  nameEn: string;
  nameAr: string;
  priceKwd: number;
  quantity: number;
  imageUrl?: string;
}

/** WhatsApp enquiries (separate from orders) */
export interface WhatsappEnquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  source: 'whatsapp' | 'contact' | 'other';
  status: 'new' | 'reviewing' | 'replied' | 'closed';
  createdAt: string;
  repliedAt?: string;
}
