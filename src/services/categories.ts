/**
 * Demo categories for the storefront.
 * Centralized source of realistic demonstration categories.
 */

export interface Category {
  id: string;
  titleEn: string;
  titleAr: string;
  image: string;
  badge?: string;
}

export const categories: Category[] = [
  {
    id: 'mobiles',
    titleEn: 'Mobiles',
    titleAr: 'الموبايلات',
    image: '/images/product-smartphone.svg',
    badge: 'Bestseller',
  },
  {
    id: 'laptops',
    titleEn: 'Laptops',
    titleAr: 'أجهزة كمبيوتر محمولة',
    image: '/images/product-laptop.svg',
    badge: 'New',
  },
  {
    id: 'gadgets',
    titleEn: 'Gadgets',
    titleAr: 'أدوات ذكية',
    image: '/images/product-hub.svg',
    badge: 'Trending',
  },
  {
    id: 'bags',
    titleEn: 'Bags',
    titleAr: 'حقائب',
    image: '/images/category-bag.svg',
  },
  {
    id: 'smartwatches',
    titleEn: 'Smart Watches',
    titleAr: 'ساعات ذكية',
    image: '/images/product-watch.svg',
    badge: 'New',
  },
  {
    id: 'headphones',
    titleEn: 'Headphones',
    titleAr: 'سماعات',
    image: '/images/product-headphones.svg',
    badge: 'Sale',
  },
  {
    id: 'accessories',
    titleEn: 'Accessories',
    titleAr: 'أدوات زينة',
    image: '/images/product-hub.svg',
  },
  {
    id: 'gaming',
    titleEn: 'Gaming',
    titleAr: 'ألعاب إلكترونية',
    image: '/images/product-gaming-mouse.svg',
    badge: 'Trending',
  },
  {
    id: 'home-electronics',
    titleEn: 'Home Electronics',
    titleAr: 'إلكترونيات منزلية',
    image: '/images/product-homehub.svg',
  },
];
