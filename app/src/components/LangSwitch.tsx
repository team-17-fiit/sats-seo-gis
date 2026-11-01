// Odkaz na rovnakú stránku v druhom jazyku. Pomáha ľuďom aj crawlerom nájsť jazykové verzie.
import Link from 'next/link';
import { HREFLANG, pagePath, T, type Locale, type PageKind } from '@/lib/i18n';

type Props = { locale: Locale; kind: PageKind; slug?: string };

export default function LangSwitch({ locale, kind, slug }: Props) {
  const other: Locale = locale === 'sk' ? 'en' : 'sk';
  return (
    <p className="lang-switch">
      <Link href={pagePath(other, kind, slug)} hrefLang={HREFLANG[other]} lang={other} id="lang-switch">
        {T[locale].switchTo}
      </Link>
    </p>
  );
}
