
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useStorefrontData } from '@/context/StorefrontDataContext';

interface AnnouncementBarProps {
  t: (path: string) => string;
}

export function AnnouncementBar({ t }: AnnouncementBarProps) {
  const { locale } = useI18n();
  const { storeSettings } = useStorefrontData();
  if (!storeSettings.announcementVisible) return null;
  const message = locale === 'ar' ? storeSettings.announcementAr : storeSettings.announcementEn;
  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
      <div className="container flex items-center justify-between gap-3 py-2.5 sm:gap-4">
        <div className="min-w-0">
          <span className="block text-sm font-bold leading-5 sm:inline">{message || t('homepage.announcement')}</span>
          <span className="hidden sm:inline text-xs opacity-90">
            {t('homepage.announcement_tag')}
          </span>
        </div>
        <Link href="/products" className="shrink-0 text-sm font-semibold hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {t('common.continue_shopping')}
        </Link>
      </div>
    </div>
  );
}
