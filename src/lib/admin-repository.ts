import { allProducts, type Product } from '@/services/products';
import { categories, type Category } from '@/services/categories';
import { extendedProducts } from '@/services/products-extended';

export interface AdminVariant {
  id: string;
  nameEn?: string;
  nameAr?: string;
  attributes: Record<string, string>;
  sku?: string;
  priceAdjustment: number;
  stock: number;
  active: boolean;
  image?: string;
}

export interface AdminProduct extends Product {
  slug: string;
  descriptionEn?: string;
  descriptionAr?: string;
  sku?: string;
  active: boolean;
  featured?: boolean;
  trending?: boolean;
  flashSale?: boolean;
  displayOrder?: number;
  stock: number;
  mediaIds?: string[];
  documents?: Array<{ mediaId: string; label: string }>;
  variants?: AdminVariant[];
}

export interface AdminCategory extends Category {
  descriptionEn?: string;
  descriptionAr?: string;
  active: boolean;
  showOnHomepage: boolean;
  showInNavigation: boolean;
  displayOrder: number;
  parentId?: string;
  navLabelEn?: string;
  navLabelAr?: string;
  navDestination?: string;
}

export interface AdminBanner {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  destination: string;
  desktopImage: string;
  mobileImage: string;
  enabled: boolean;
  displayOrder: number;
}

export type HomepageSectionId = 'categories' | 'flash-sale' | 'best-sellers' | 'trending' | 'new-arrivals' | 'electronics' | 'promotions';
export interface HomepageSection {
  id: HomepageSectionId;
  visible: boolean;
  displayOrder: number;
  titleEn?: string;
  titleAr?: string;
  productIds?: string[];
  subtitleEn?: string;
  subtitleAr?: string;
  maxProducts?: number;
  theme?: 'default' | 'purple' | 'orange' | 'yellow';
}

export interface StoreSettings {
  displayName: string;
  contactPhone: string;
  contactEmail: string;
  deliveryInfo: string;
  deliveryMessageEn: string;
  deliveryMessageAr: string;
  announcementEn: string;
  announcementAr: string;
  announcementVisible: boolean;
  freeDeliveryThreshold?: number;
}

export interface AdminStoreData {
  version: 2;
  products: AdminProduct[];
  categories: AdminCategory[];
  banners: AdminBanner[];
  homepageSections: HomepageSection[];
  whatsappNumber: string;
  storeSettings: StoreSettings;
  updatedAt: string;
}

const STORAGE_KEY = 'kdeals_admin_store_v1';
type PersistedStore = Omit<Partial<AdminStoreData>, 'version'> & { version?: number };
const defaultSections = (): HomepageSection[] => [
  { id: 'categories', visible: true, displayOrder: 0 },
  { id: 'flash-sale', visible: true, displayOrder: 1 },
  { id: 'best-sellers', visible: true, displayOrder: 2 },
  { id: 'trending', visible: true, displayOrder: 3 },
  { id: 'new-arrivals', visible: true, displayOrder: 4 },
  { id: 'electronics', visible: true, displayOrder: 5 },
  { id: 'promotions', visible: true, displayOrder: 6 },
];

export const createSeedStore = (): AdminStoreData => ({
  version: 2,
  products: allProducts.map((product, index) => {
    const extended = extendedProducts.find((item) => item.id === product.id);
    return { ...product, slug: extended?.slug || product.id, descriptionEn: extended?.descriptionEn, descriptionAr: extended?.descriptionAr, variants: extended?.variants?.map((variant) => ({ ...variant, active: true })), active: true, featured: product.isBestseller, trending: index >= 10 && index < 13, flashSale: product.discountPercent > 0, displayOrder: index, stock: extended?.stock ?? 10 };
  }),
  categories: categories.map((category, index) => ({ ...category, active: true, showOnHomepage: true, showInNavigation: true, displayOrder: index })),
  banners: [{
    id: 'hero-default', titleEn: 'Big Deals. Better Prices.', titleAr: 'عروض كبيرة. أسعار أفضل.',
    subtitleEn: 'Discover electronics, gadgets and everyday essentials across Kuwait.', subtitleAr: 'اكتشف الإلكترونيات والأدوات والاحتياجات اليومية في جميع أنحاء الكويت.',
    ctaLabelEn: 'Shop Now', ctaLabelAr: 'تسوّق الآن', destination: '/products', desktopImage: '/images/kdeals-hero-electronics.png', mobileImage: '/images/kdeals-hero-electronics.png', enabled: true, displayOrder: 0,
  }],
  homepageSections: defaultSections(),
  whatsappNumber: '96565843535',
  storeSettings: { displayName: 'K DEALS', contactPhone: '96565843535', contactEmail: '', deliveryInfo: '', deliveryMessageEn: '', deliveryMessageAr: '', announcementEn: '', announcementAr: '', announcementVisible: true },
  updatedAt: new Date(0).toISOString(),
});

export function readAdminStore(): AdminStoreData {
  if (typeof window === 'undefined') return createSeedStore();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as PersistedStore | null;
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.categories)) return createSeedStore();
    if (parsed.version === 1) {
      return { ...createSeedStore(), ...parsed, version: 2, banners: createSeedStore().banners, homepageSections: defaultSections() };
    }
    if (parsed.version !== 2 || !Array.isArray(parsed.banners) || !Array.isArray(parsed.homepageSections)) return createSeedStore();
    const existing = parsed as AdminStoreData;
    return {
      ...existing, storeSettings: { ...createSeedStore().storeSettings, ...existing.storeSettings },
      products: existing.products.map((product) => {
        if (product.variants) return product;
        const demo = extendedProducts.find((item) => item.id === product.id);
        return { ...product, variants: demo?.variants?.map((variant) => ({ ...variant, active: true })) };
      }),
    };
  } catch { return createSeedStore(); }
}

export function saveAdminStore(data: AdminStoreData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('kdeals-admin-store'));
}

export interface AdminRepository {
  read(): AdminStoreData;
  save(data: AdminStoreData): void;
  reset(): AdminStoreData;
}

export const localAdminRepository: AdminRepository = {
  read: readAdminStore,
  save: saveAdminStore,
  reset: () => { const seed = createSeedStore(); saveAdminStore(seed); return seed; },
};
