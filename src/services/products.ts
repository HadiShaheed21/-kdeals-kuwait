/**
 * Demo products for the storefront.
 * Centralized source of realistic demonstration products.
 */

export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  image: string;
  originalPrice: number;
  price: number;
  discountPercent: number;
  isBestseller: boolean;
  isNew: boolean;
  badgeLabel?: string;
  categoryId: string;
}

// All products — used by the homepage sections (Flash Sale, Best Sellers, etc.)
export const allProducts: Product[] = [
  // Flash Sale items
  {
    id: 'p1',
    categoryId: 'headphones',
    nameEn: 'Wireless Bluetooth Headphones Pro',
    nameAr: 'سماعات لاسلكية برو',
    image: '/images/product-headphones.svg',
    originalPrice: 45.0,
    price: 29.99,
    discountPercent: 33,
    isBestseller: true,
    isNew: false,
  },
  {
    id: 'p2',
    categoryId: 'smartwatches',
    nameEn: 'Smart Watch Series 6',
    nameAr: 'ساعة ذكية سيرييز 6',
    image: '/images/product-watch.svg',
    originalPrice: 120.0,
    price: 89.99,
    discountPercent: 25,
    isBestseller: true,
    isNew: true,
    badgeLabel: 'New',
  },
  {
    id: 'p3',
    categoryId: 'gadgets',
    nameEn: 'Bluetooth Speaker Mini',
    nameAr: 'سبيكر بلوتوث ميني',
    image: '/images/product-speaker.svg',
    originalPrice: 35.0,
    price: 24.99,
    discountPercent: 29,
    isBestseller: false,
    isNew: false,
  },
  {
    id: 'p4',
    categoryId: 'mobiles',
    nameEn: 'Smartphone 128GB Black',
    nameAr: 'هاتف ذكي 128GB أسود',
    image: '/images/product-smartphone.svg',
    originalPrice: 299.0,
    price: 229.99,
    discountPercent: 23,
    isBestseller: true,
    isNew: false,
  },
  {
    id: 'p5',
    categoryId: 'laptops',
    nameEn: 'Laptop 14" Intel Core i5',
    nameAr: 'لابتوب 14 بوصة',
    image: '/images/product-laptop.svg',
    originalPrice: 599.0,
    price: 449.99,
    discountPercent: 25,
    isBestseller: true,
    isNew: false,
  },
  // Best Sellers
  {
    id: 'p6',
    categoryId: 'headphones',
    nameEn: 'Noise-Cancelling Earbuds',
    nameAr: 'سماعات أذن كهربائية',
    image: '/images/product-earbuds.svg',
    originalPrice: 89.0,
    price: 69.99,
    discountPercent: 21,
    isBestseller: true,
    isNew: true,
    badgeLabel: 'New',
  },
  {
    id: 'p7',
    categoryId: 'gadgets',
    nameEn: '4K Action Camera',
    nameAr: 'كاميرا فيديو إجرائية 4K',
    image: '/images/product-camera.svg',
    originalPrice: 250.0,
    price: 199.99,
    discountPercent: 20,
    isBestseller: true,
    isNew: false,
  },
  {
    id: 'p8',
    categoryId: 'gadgets',
    nameEn: 'USB-C Hub 7-in-1',
    nameAr: 'هوب USB-C 7 في 1',
    image: '/images/product-hub.svg',
    originalPrice: 45.0,
    price: 32.99,
    discountPercent: 27,
    isBestseller: false,
    isNew: false,
  },
  {
    id: 'p9',
    categoryId: 'gadgets',
    nameEn: 'Tablet Pro 10.9"',
    nameAr: 'تابليت برو 10.9 بوصة',
    image: '/images/product-tablet.svg',
    originalPrice: 499.0,
    price: 399.99,
    discountPercent: 20,
    isBestseller: true,
    isNew: false,
  },
  {
    id: 'p10',
    categoryId: 'smartwatches',
    nameEn: 'Fitness Tracker Band',
    nameAr: 'شريط تتبع اللياقة البدنية',
    image: '/images/product-fitness.svg',
    originalPrice: 30.0,
    price: 22.99,
    discountPercent: 23,
    isBestseller: false,
    isNew: false,
  },
  // Trending
  {
    id: 'p11',
    categoryId: 'gaming',
    nameEn: 'Gaming Mouse Wireless',
    nameAr: 'ماوس ألعاب لاسلكي',
    image: '/images/product-gaming-mouse.svg',
    originalPrice: 65.0,
    price: 49.99,
    discountPercent: 23,
    isBestseller: false,
    isNew: false,
  },
  {
    id: 'p12',
    categoryId: 'gadgets',
    nameEn: 'Portable Power Bank 20000mAh',
    nameAr: 'محول طاقة محمول 20000mAh',
    image: '/images/product-powerbank.svg',
    originalPrice: 55.0,
    price: 39.99,
    discountPercent: 27,
    isBestseller: false,
    isNew: true,
    badgeLabel: 'New',
  },
  // New Arrivals
  {
    id: 'p13',
    categoryId: 'home-electronics',
    nameEn: 'Smart Home Hub',
    nameAr: 'هاب منزل ذكي',
    image: '/images/product-homehub.svg',
    originalPrice: 120.0,
    price: 89.99,
    discountPercent: 25,
    isBestseller: false,
    isNew: true,
    badgeLabel: 'New',
  },
  {
    id: 'p14',
    categoryId: 'gadgets',
    nameEn: 'Digital Camera 20MP',
    nameAr: 'كاميرا رقمية 20MP',
    image: '/images/product-camera.svg',
    originalPrice: 350.0,
    price: 279.99,
    discountPercent: 20,
    isBestseller: false,
    isNew: true,
    badgeLabel: 'New',
  },
  {
    id: 'p15',
    categoryId: 'laptops',
    nameEn: 'Ultrabook 13" i7 16GB',
    nameAr: 'ألبريلوت 13 بوصة i7 16GB',
    image: '/images/product-laptop.svg',
    originalPrice: 799.0,
    price: 649.99,
    discountPercent: 19,
    isBestseller: false,
    isNew: false,
  },
];

/** Flash Sale section products (subset of allProducts) */
export const flashSaleProducts = allProducts.slice(0, 4);

/** Best Sellers section products */
export const bestSellerProducts = allProducts.filter((p) => p.isBestseller).slice(0, 6);

/** New Arrivals section products */
export const newArrivalProducts = allProducts.filter((p) => p.isNew).slice(0, 6);

/** Electronics showcase items */
export const electronicsShowcase: Product[] = allProducts.slice(4, 10);
