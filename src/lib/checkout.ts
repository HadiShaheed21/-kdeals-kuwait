import type { CartItem } from '@/lib/cart';
import { formatKwd } from '@/lib/currency';
import type { Locale } from '@/lib/i18n/config';

export interface CheckoutDetails {
  fullName: string;
  phone: string;
  alternatePhone: string;
  governorate: string;
  area: string;
  block: string;
  street: string;
  building: string;
  floorApartment: string;
  notes: string;
}

export const KUWAIT_GOVERNORATES = ['Capital', 'Hawalli', 'Farwaniya', 'Ahmadi', 'Jahra', 'Mubarak Al-Kabeer'] as const;
export const WHATSAPP_BUSINESS_NUMBER = '96565843535';

export function normalizeKuwaitPhone(value: string): string | null {
  let digits = value.trim().replace(/[\s()-]/g, '');
  if (digits.startsWith('+965')) digits = digits.slice(4);
  else if (digits.startsWith('00965')) digits = digits.slice(5);
  else if (digits.startsWith('965') && digits.length === 11) digits = digits.slice(3);

  return /^[2569]\d{7}$/.test(digits) ? `+965${digits}` : null;
}

export function validateCheckoutDetails(details: CheckoutDetails, locale: Locale): Partial<Record<keyof CheckoutDetails, string>> {
  const ar = locale === 'ar';
  const required = ar ? 'هذا الحقل مطلوب.' : 'This field is required.';
  const phoneError = ar ? 'أدخل رقم كويتي صحيحاً من 8 أرقام.' : 'Enter a valid 8-digit Kuwait number.';
  const errors: Partial<Record<keyof CheckoutDetails, string>> = {};

  (['fullName', 'phone', 'governorate', 'area', 'block', 'street', 'building'] as const).forEach((field) => {
    if (!details[field].trim()) errors[field] = required;
  });
  if (details.phone && !normalizeKuwaitPhone(details.phone)) errors.phone = phoneError;
  if (details.alternatePhone && !normalizeKuwaitPhone(details.alternatePhone)) errors.alternatePhone = phoneError;
  return errors;
}

function variantLabel(item: CartItem, locale: Locale): string {
  if (item.attributes && Object.keys(item.attributes).length > 0) return Object.values(item.attributes).join(', ');
  if (item.variantId) return item.variantId;
  return locale === 'ar' ? 'لا يوجد' : 'Not selected';
}

export function createWhatsAppOrderMessage(items: CartItem[], details: CheckoutDetails, locale: Locale): string {
  const ar = locale === 'ar';
  const customerPhone = normalizeKuwaitPhone(details.phone) ?? details.phone.trim();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const labels = ar
    ? { title: 'K DEALS — استفسار طلب جديد', customer: 'العميل', phone: 'الهاتف', address: 'عنوان التوصيل', governorate: 'المحافظة', area: 'المنطقة', block: 'القطعة', street: 'الشارع', building: 'المبنى / المنزل', floor: 'الطابق / الشقة', notes: 'ملاحظات', items: 'المنتجات', variant: 'الخيار', quantity: 'الكمية', unit: 'سعر الوحدة', line: 'إجمالي المنتج', subtotal: 'المجموع الفرعي', delivery: 'التوصيل', pending: 'بانتظار التأكيد', payable: 'الإجمالي المستحق', confirm: 'يرجى تأكيد التوفر ورسوم التوصيل وطريقة الدفع.' }
    : { title: 'K DEALS — NEW ORDER ENQUIRY', customer: 'Customer', phone: 'Phone', address: 'Delivery Address', governorate: 'Governorate', area: 'Area', block: 'Block', street: 'Street', building: 'Building / House', floor: 'Floor / Apartment', notes: 'Notes', items: 'ORDER ITEMS', variant: 'Variant', quantity: 'Quantity', unit: 'Unit Price', line: 'Line Total', subtotal: 'Subtotal', delivery: 'Delivery', pending: 'To be confirmed', payable: 'Payable Total', confirm: 'Please confirm availability, delivery charges and payment instructions.' };

  const addressLines = [
    `${labels.governorate}: ${details.governorate.trim()}`,
    `${labels.area}: ${details.area.trim()}`,
    `${labels.block}: ${details.block.trim()}`,
    `${labels.street}: ${details.street.trim()}`,
    `${labels.building}: ${details.building.trim()}`,
    details.floorApartment.trim() ? `${labels.floor}: ${details.floorApartment.trim()}` : '',
    details.notes.trim() ? `${labels.notes}: ${details.notes.trim()}` : '',
  ].filter(Boolean);
  const itemLines = items.flatMap((item, index) => [
    `${index + 1}. ${locale === 'ar' ? item.nameAr : item.name}`,
    `${labels.variant}: ${variantLabel(item, locale)}`,
    `${labels.quantity}: ${item.quantity}`,
    `${labels.unit}: ${formatKwd(item.price, locale)}`,
    `${labels.line}: ${formatKwd(item.price * item.quantity, locale)}`,
    '',
  ]);

  return [
    labels.title,
    '',
    `${labels.customer}: ${details.fullName.trim()}`,
    `${labels.phone}: ${customerPhone}`,
    details.alternatePhone.trim() ? `${ar ? 'هاتف بديل' : 'Alternate phone'}: ${normalizeKuwaitPhone(details.alternatePhone) ?? details.alternatePhone.trim()}` : '',
    '',
    `${labels.address}:`,
    ...addressLines,
    '',
    labels.items,
    '',
    ...itemLines,
    `${labels.subtotal}: ${formatKwd(subtotal, locale)}`,
    `${labels.delivery}: ${labels.pending}`,
    `${labels.payable}: ${labels.pending}`,
    '',
    labels.confirm,
  ].filter(Boolean).join('\n');
}

export function createWhatsAppOrderUrl(
  items: CartItem[],
  details: CheckoutDetails,
  locale: Locale,
  businessNumber = WHATSAPP_BUSINESS_NUMBER,
): string {
  const recipient = businessNumber.replace(/\D/g, '') || WHATSAPP_BUSINESS_NUMBER;
  return `https://wa.me/${recipient}?text=${encodeURIComponent(createWhatsAppOrderMessage(items, details, locale))}`;
}
