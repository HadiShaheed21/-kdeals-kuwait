/**
 * Demo promotions for the storefront.
 * Centralized source of realistic demonstration promotional banners.
 */

export interface Promotion {
  id: string;
  image: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
}

// Homepage promotional banners
export const heroBanners: Promotion[] = [
  {
    id: 'hero1',
    image: '/images/kdeals-hero-electronics.png',
    titleEn: 'Best Smartphones Deals',
    titleAr: 'أفضل عروض الهواتف الذكية',
    subtitleEn: 'Up to 30% off on the latest flagship smartphones. Limited time.',
    subtitleAr: 'خصم حتى 30% على أحدث الهواتف الذكية المتخصصة. وقت محدود.',
    ctaLabelEn: 'Shop Smartphones',
    ctaLabelAr: 'تسوق الهواتف',
  },
  {
    id: 'hero2',
    image: '/images/kdeals-hero-electronics.png',
    titleEn: 'Laptop Sale',
    titleAr: 'عروض الأجهزة اللوحية',
    subtitleEn: 'Start from 199.99 KD. Free delivery across Kuwait.',
    subtitleAr: 'ابداً من 199.99 د.ك. توريد مجاني عبر الكويت.',
    ctaLabelEn: 'Shop Laptops',
    ctaLabelAr: 'تسوق الأجهزة',
  },
  {
    id: 'hero3',
    image: '/images/kdeals-hero-electronics.png',
    titleEn: 'Audio & Headphones',
    titleAr: 'الاستماع والأذنين',
    subtitleEn: 'Premium audio at unbeatable prices.',
    subtitleAr: 'استماع مميز بسعر لا يُضاهى.',
    ctaLabelEn: 'Shop Audio',
    ctaLabelAr: 'تسوق الاستماع',
  },
];

// Kuwait-specific promotion
export const kuwaitPropromotion: Promotion = {
  id: 'kuwait',
  image: '/images/kdeals-hero-electronics.png',
  titleEn: 'Free Delivery Across Kuwait',
  titleAr: 'توصيل مجاني عبر الكويت',
  subtitleEn: 'On all orders above 20.000 KD. Express delivery available.',
  subtitleAr: 'عند جميع الطلبيات فوق 20.000 د.ك. توصيل سريع متاح.',
  ctaLabelEn: 'Shop Now',
  ctaLabelAr: 'تسوق الآن',
};

// Extended promotions
export const extraPromotions: Promotion[] = [
  {
    id: 'promo1',
    image: '/images/kdeals-hero-electronics.png',
    titleEn: 'Limited Time Offer',
    titleAr: 'عرض لفترة محدودة',
    subtitleEn: '25% off on all electronics. End of week.',
    subtitleAr: 'خصم 25% على كل الإلكترونيات. نهاية الأسبوع.',
    ctaLabelEn: 'Shop Now',
    ctaLabelAr: 'تسوق الآن',
  },
  {
    id: 'promo2',
    image: '/images/kdeals-hero-electronics.png',
    titleEn: 'Coupon Codes',
    titleAr: 'رموز خصم',
    subtitleEn: 'Use code KDL20 for extra 20% off.',
    subtitleAr: 'استخدم رمز KDL20 للخصم الإضافي 20%.',
    ctaLabelEn: 'Redeem Now',
    ctaLabelAr: 'استخدم الآن',
  },
];
