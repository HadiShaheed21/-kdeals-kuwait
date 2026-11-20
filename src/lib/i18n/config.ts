import enJson from './translations/en.json';
import arJson from './translations/ar.json';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

/** Nested translation keys are joined with dots, e.g. "common.search" */
export interface Translations {
  common: Record<string, string>;
  navbar: Record<string, string>;
  footer: Record<string, string>;
  homepage: Record<string, string>;
  products: Record<string, string>;
  checkout: Record<string, string>;
  account: Record<string, string>;
}

export const translations: Record<Locale, Translations> = {
  en: enJson as Translations,
  ar: arJson as Translations,
};

export function getTranslation(locale: Locale, path: string): string {
  const keys = path.split('.');
  let value: unknown = translations[locale];
  for (const key of keys) {
    if (typeof value !== 'object' || value === null || !Object.hasOwn(value, key)) {
      return path;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === 'string' ? value : path;
}

export function getNestedTranslation(locale: Locale, ...keys: string[]): string {
  let value: unknown = translations[locale];
  for (const key of keys) {
    if (typeof value !== 'object' || value === null || !Object.hasOwn(value, key)) {
      return keys.join('.');
    }
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === 'string' ? value : keys.join('.');
}
