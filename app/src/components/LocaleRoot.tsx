// Koreňový <html lang> je "sk" (jeden root layout). Anglický obsah preto obalíme prvkom s lang="en",
// aby ho čítačky obrazovky a nástroje čítali po anglicky. Slovenské stránky ostávajú bez obalu.
import type { Locale } from '@/lib/i18n';

export default function LocaleRoot({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  if (locale === 'sk') return <>{children}</>;
  return <div lang={locale}>{children}</div>;
}
