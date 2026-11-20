'use client';

import { ArrowLeft, LockKeyhole, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { createWhatsAppOrderUrl, KUWAIT_GOVERNORATES, type CheckoutDetails, validateCheckoutDetails } from '@/lib/checkout';
import { formatKwd } from '@/lib/currency';
import { useI18n } from '@/lib/i18n';
import { useStorefrontData } from '@/context/StorefrontDataContext';
import { ManagedImage } from '@/ui/media/ManagedImage';

const emptyDetails: CheckoutDetails = {
  fullName: '', phone: '', alternatePhone: '', governorate: '', area: '', block: '', street: '', building: '', floorApartment: '', notes: '',
};

export default function CheckoutPage() {
  const { locale, t } = useI18n();
  const { items, total } = useCart();
  const { whatsappNumber } = useStorefrontData();
  const [details, setDetails] = useState<CheckoutDetails>(emptyDetails);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutDetails, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const ar = locale === 'ar';
  const governorateLabels: Record<string, string> = ar ? { Capital: 'العاصمة', Hawalli: 'حولي', Farwaniya: 'الفروانية', Ahmadi: 'الأحمدي', Jahra: 'الجهراء', 'Mubarak Al-Kabeer': 'مبارك الكبير' } : {};

  const update = (field: keyof CheckoutDetails, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (submitError) setSubmitError('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0) return;
    const validationErrors = validateCheckoutDetails(details, locale);
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    const url = createWhatsAppOrderUrl(items, details, locale, whatsappNumber);
    try {
      window.location.assign(url);
    } catch {
      setSubmitError(t('checkout.whatsapp_failed'));
    }
  };

  const fieldClass = (field: keyof CheckoutDetails) => `mt-1.5 h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 ${errors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-purple-400 focus:ring-purple-100'}`;
  const renderError = (field: keyof CheckoutDetails) => errors[field] && <p className="mt-1 text-xs font-medium text-red-600">{errors[field]}</p>;

  if (items.length === 0) return <main className="bg-slate-50 py-6 sm:py-10"><div className="container"><section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm"><ShoppingBag aria-hidden="true" className="mx-auto h-11 w-11 text-purple-600" strokeWidth={1.5} /><h1 className="mt-4 text-2xl font-extrabold text-slate-900">{t('checkout.empty_cart')}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t('checkout.empty_cart_message')}</p><Link href={`/${locale}/products`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600">{t('cart.keep_shopping')}</Link></section></div></main>;

  return (
    <main className="bg-slate-50 py-5 sm:py-8">
      <div className="container"><div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between gap-3"><Link href={`/${locale}/cart`} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-purple-700"><ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />{t('checkout.back_to_cart')}</Link><Link href={`/${locale}`} className="relative h-9 w-28 shrink-0"><Image src="/images/kdeals-logo.png" alt="K DEALS" fill sizes="112px" className="object-contain" priority /></Link></header>
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-purple-700 to-orange-500 px-5 py-5 text-white shadow-lg sm:px-7"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><LockKeyhole aria-hidden="true" className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">K DEALS</p><h1 className="mt-1 text-2xl font-extrabold">{t('checkout.checkout')}</h1><p className="mt-1 text-sm leading-5 text-white/85">{ar ? 'راجع بياناتك ثم أرسل استفسارك عبر واتساب.' : 'Review your details, then send your order enquiry through WhatsApp.'}</p></div></div></div>

        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-lg font-extrabold text-slate-900">{t('checkout.customer_information')}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700 sm:col-span-2">{t('checkout.full_name')}<input value={details.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" className={fieldClass('fullName')} />{renderError('fullName')}</label><label className="block text-sm font-bold text-slate-700">{t('checkout.phone')}<span className="ms-1 text-orange-600">*</span><div className="relative"><Phone aria-hidden="true" className="pointer-events-none absolute start-3 top-[1.25rem] h-4 w-4 text-slate-400" /><input value={details.phone} onChange={(event) => update('phone', event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+965 65843535" className={`${fieldClass('phone')} ps-9`} /></div>{renderError('phone')}</label><label className="block text-sm font-bold text-slate-700">{t('checkout.alternate_phone')}<input value={details.alternatePhone} onChange={(event) => update('alternatePhone', event.target.value)} inputMode="tel" autoComplete="tel-national" className={fieldClass('alternatePhone')} />{renderError('alternatePhone')}</label></div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-lg font-extrabold text-slate-900">{t('checkout.delivery_address')}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">{t('checkout.governorate')}<select value={details.governorate} onChange={(event) => update('governorate', event.target.value)} className={fieldClass('governorate')}><option value="">{ar ? 'اختر المحافظة' : 'Select governorate'}</option>{KUWAIT_GOVERNORATES.map((governorate) => <option key={governorate} value={governorate}>{governorateLabels[governorate] || governorate}</option>)}</select>{renderError('governorate')}</label><label className="block text-sm font-bold text-slate-700">{t('checkout.area')}<input value={details.area} onChange={(event) => update('area', event.target.value)} autoComplete="address-level2" className={fieldClass('area')} />{renderError('area')}</label><label className="block text-sm font-bold text-slate-700">{t('checkout.block')}<input value={details.block} onChange={(event) => update('block', event.target.value)} className={fieldClass('block')} />{renderError('block')}</label><label className="block text-sm font-bold text-slate-700">{t('checkout.street')}<input value={details.street} onChange={(event) => update('street', event.target.value)} autoComplete="street-address" className={fieldClass('street')} />{renderError('street')}</label><label className="block text-sm font-bold text-slate-700">{t('checkout.building')}<input value={details.building} onChange={(event) => update('building', event.target.value)} className={fieldClass('building')} />{renderError('building')}</label><label className="block text-sm font-bold text-slate-700">{t('checkout.floor_apartment')}<input value={details.floorApartment} onChange={(event) => update('floorApartment', event.target.value)} className={fieldClass('floorApartment')} /></label><label className="block text-sm font-bold text-slate-700 sm:col-span-2">{t('checkout.delivery_notes')}<textarea value={details.notes} onChange={(event) => update('notes', event.target.value)} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100" /></label></div></section>
          </div>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24"><h2 className="text-lg font-extrabold text-slate-900">{t('checkout.order_summary')}</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={`${item.productId}:${item.variantId || 'default'}`} className="flex gap-3"><div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50"><ManagedImage src={item.image} alt={ar ? item.nameAr : item.name} fill sizes="56px" className="object-contain p-1.5" /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">{ar ? item.nameAr : item.name}</p><p className="mt-0.5 text-xs text-slate-500">{item.variantId || (ar ? 'بدون خيار' : 'No variant')} · {t('checkout.quantity')}: {item.quantity}</p><div className="mt-1 flex justify-between gap-2 text-xs"><span className="text-slate-500">{formatKwd(item.price, locale)}</span><span className="font-bold text-slate-900">{formatKwd(item.price * item.quantity, locale)}</span></div></div></div>)}</div><div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-500">{t('checkout.order_total')}</span><span className="font-bold text-slate-900">{formatKwd(total, locale)}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">{t('checkout.delivery_charge')}</span><span className="font-semibold text-amber-700">{t('checkout.delivery_pending')}</span></div><div className="flex justify-between gap-4 border-t border-slate-100 pt-3"><span className="font-extrabold text-slate-900">{t('checkout.payable_total')}</span><span className="text-end font-extrabold text-amber-700">{t('checkout.delivery_pending')}</span></div></div><button type="submit" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-extrabold text-white transition hover:bg-[#20bd5a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><MessageCircle aria-hidden="true" className="h-5 w-5" />{t('checkout.continue_whatsapp')}</button><p className="mt-3 text-center text-xs leading-5 text-slate-500">{t('checkout.send_explainer')}</p>{submitError && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">{submitError}</p>}</aside>
        </form>
      </div></div>
    </main>
  );
}
