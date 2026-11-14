/**
 * KWD (Kuwaiti Dinar) currency formatting utilities.
 * KWD = 1000 fils, so prices use THREE decimal places (e.g. 1.234 د.ك).
 * Arabic: ١٫٢٣٤ د.ك
 */

/** Format KWD number with 3 decimal places and KWD symbol/dīnār text. */
export function formatKwd(amount: number, locale: 'en' | 'ar' = 'en'): string {
  const formatted = Number(amount).toFixed(3);
  if (locale === 'ar') {
    return `${arNum(amount)} د.ك`;
  }
  return `${formatted} د.ك`;
}

/** Format KWD amount in Arabic with Eastern Arabic numerals (RTL-safe). */
export function formatKwdArabic(amount: number): string {
  const formatted = Number(amount).toFixed(3);
  return `${arNum(amount)} د.ك`;
}

/** Convert Arabic-Indic digits to Eastern Arabic numerals (for RTL display). */
export function arNum(n: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return Number(n).toFixed(3).replace(/\d/g, (d) => digits[parseInt(d, 10)]);
}

/** Parse KWD string back to number (for admin input). */
export function parseKwd(str: string): number {
  // Remove KWD symbol, Arabic numerals, and dots
  const cleaned = str
    .replace(/[dkKKDK]/g, '')
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(0x30 + parseInt(d, 19) - 0x30))
    .replace(/,/g, '.')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
