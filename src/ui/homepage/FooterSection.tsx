

import Image from 'next/image';

interface FooterSectionProps {
  t: (path: string) => string;
  categories: { id: string; titleEn: string; titleAr: string }[];
}

export function FooterSection({ t, categories }: FooterSectionProps) {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="container py-8">
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-2">
          <div className="relative h-10 w-40 md:h-12 md:w-48 overflow-hidden rounded-lg">
            <Image
              src="/images/kdeals-logo.png"
              alt="K DEALS"
              fill
              sizes="(max-width: 768px) 100px, 150px"
              className="object-contain"
              loading="lazy"
            />
          </div>
          <span className="hidden sm:inline text-sm text-slate-400">— Kuwait</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="text-lg font-bold mb-3">About K DEALS</h3>
            <p className="text-sm text-slate-400">{t('footer.about_text')}</p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-3">Contact</h3>
            <p className="text-sm text-slate-400">{t('footer.contact_text')}</p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-3">Categories</h3>
            <ul className="text-sm space-y-1">
              {categories.map((category) => (
                <li key={category.id}>
                  <a href="#" className="hover:text-white transition-colors">
                    {category.titleEn}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-3">Delivery</h3>
            <p className="text-sm text-slate-400">{t('footer.delivery_text')}</p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href="https://wa.me/965565843535"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors shadow-md">
                  <span className="text-lg">💬</span>
                  {t('common.whatsapp')}
                </button>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
