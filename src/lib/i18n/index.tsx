'use client';

import { getNestedTranslation, type Locale } from './config';

interface I18nContextType {
  locale: Locale;
  t: (path: string) => string;
  changeLocale: (locale: Locale) => void;
}

import { createContext, useContext, useState, type ReactNode } from 'react';

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState<Locale>(locale);

  const t = (path: string) => getNestedTranslation(currentLocale, ...path.split('.'));

  const changeLocale = (newLocale: Locale) => {
    setCurrentLocale(newLocale);
  };

  return (
    <I18nContext.Provider value={{ locale: currentLocale, t, changeLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
