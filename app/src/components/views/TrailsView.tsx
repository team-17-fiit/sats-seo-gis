// Prehľad 7 tematických trás (SSG). Crawlovateľný zoznam s odkazmi na detail každej trasy.
import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import LangSwitch from '@/components/LangSwitch';
import LocaleRoot from '@/components/LocaleRoot';
import Stripes from '@/components/Stripes';
import { alternatesFor, OG_LOCALE, pagePath, T, type Locale } from '@/lib/i18n';
import { difficultyLabel, getPaths, trailName, trailSummary } from '@/lib/paths';
import { SITE_URL } from '@/lib/site';

export function trailsMetadata(locale: Locale): Metadata {
  const t = T[locale];
  return {
    title: t.trailsTitle,
    description: t.trailsDescription,
    alternates: alternatesFor(locale, 'trails'),
    openGraph: { title: t.trailsTitle, description: t.trailsDescription, type: 'website', locale: OG_LOCALE[locale] },
  };
}

export default function TrailsView({ locale }: { locale: Locale }) {
  const t = T[locale];
  const paths = getPaths();
  return (
    <LocaleRoot locale={locale}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: t.trailsHeading,
          inLanguage: locale,
          itemListElement: paths.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: SITE_URL + pagePath(locale, 'trail', p.slug),
            name: trailName(p, locale),
          })),
        }}
      />
      <header className="top">
        <Stripes />
        <p><Link href={pagePath(locale, 'home')}>{t.home}</Link></p>
        <LangSwitch locale={locale} kind="trails" />
        <h1>{t.trailsHeading}</h1>
        <p>{t.trailsLead}</p>
      </header>
      <main>
        <ul className="path-list" id="path-list">
          {paths.map((p) => {
            const summary = trailSummary(p, locale);
            return (
              <li key={p.slug} className="path-card" style={{ borderLeftColor: p.colour }}>
                <h2><Link href={pagePath(locale, 'trail', p.slug)}>{trailName(p, locale)}</Link></h2>
                <p className="path-meta">
                  {p.length_km ? `≈ ${p.length_km} km · ` : ''}
                  {t.stops(p.stops.length)} · {t.difficultyWord} {difficultyLabel(p.difficulty, locale)} · {t.pilot.toLowerCase()} {p.pilot_code}
                </p>
                {summary && <p>{summary}</p>}
              </li>
            );
          })}
        </ul>
      </main>
    </LocaleRoot>
  );
}
