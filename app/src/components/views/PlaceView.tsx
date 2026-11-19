// Stránka miesta (SSG, T2-10): každé miesto tieru T1 má vlastnú crawlovateľnú URL v každom jazyku
// s canonical adresou, hreflang alternatívami a štruktúrovanými dátami schema.org.
import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import LangSwitch from '@/components/LangSwitch';
import MapLoader from '@/components/MapLoader';
import NearbyPois from '@/components/NearbyPois';
import Stripes from '@/components/Stripes';
import { alternatesFor, mapTexts, pagePath, T, type Locale } from '@/lib/i18n';
import { socialMetadata } from '@/lib/og';
import { breadcrumbJsonLd, placeCrumbs } from '@/lib/breadcrumbs';
import { getPath, trailName } from '@/lib/paths';
import { categoryLabel, getPoi, poiDescription, poiImage, poiJsonLd, poiName, poiToGeoJSON, type Poi } from '@/lib/pois';
import { SITE_URL } from '@/lib/site';

function pathsOf(p: Poi, locale: Locale) {
  return p.paths.flatMap((slug) => {
    const path = getPath(slug);
    return path ? [{ slug: path.slug, name_sk: trailName(path, locale), colour: path.colour }] : [];
  });
}

export function placeMetadata(locale: Locale, slug: string): Metadata {
  const p = getPoi(slug);
  if (!p) return {};
  // Bez vlastného anglického názvu by mala EN stránka rovnaký title ako SK – doplníme kategóriu.
  const sameName = locale === 'en' && (!p.name_en || p.name_en === p.name_sk);
  const title = sameName
    ? T[locale].placeTitleWithCategory(poiName(p, locale), categoryLabel(p.category, locale))
    : poiName(p, locale);
  const description = poiDescription(p, pathsOf(p, locale).map((x) => x.name_sk), locale);
  return {
    title,
    description,
    alternates: alternatesFor(locale, 'place', p.slug),
    ...socialMetadata(locale, 'place', p.slug, title, description, 'article'),
  };
}

export default function PlaceView({ locale, poi: p }: { locale: Locale; poi: Poi }) {
  const t = T[locale];
  const paths = pathsOf(p, locale);
  const name = poiName(p, locale);
  const other = locale === 'en' ? p.name_sk : p.name_en;
  const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=15/${p.lat}/${p.lon}`;
  const mainTrail = paths[0] && { slug: paths[0].slug, name: paths[0].name_sk };
  const crumbs = placeCrumbs(locale, { slug: p.slug, name }, mainTrail);
  const image = poiImage(p);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs, SITE_URL)} />
      <JsonLd data={poiJsonLd(p, SITE_URL, paths, locale)} />
      <header className="top">
        <Stripes />
        <p>
          {paths[0]
            ? <Link href={pagePath(locale, 'trail', paths[0].slug)}>← {paths[0].name_sk}</Link>
            : <Link href={pagePath(locale, 'trails')}>{t.allTrails}</Link>}
        </p>
        <LangSwitch locale={locale} kind="place" slug={p.slug} />
        <h1>{name}</h1>
        {other && other !== name && <p lang={locale === 'en' ? 'sk' : 'en'} className="muted">{other}</p>}
      </header>
      <main id="main" tabIndex={-1}>
        {image && (
          <figure className="place-image">
            {/* statický export: obrázok ide priamo z Commons, next/image by ho aj tak neoptimalizoval */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={name} width={960} height={640} decoding="async" />
            <figcaption className="note">
              {t.photo}{image.author && <>: {image.author}</>}
              {image.licence && (
                <> · {image.licenceUrl
                  ? <a href={image.licenceUrl} rel="license noopener noreferrer">{image.licence}</a>
                  : image.licence}</>
              )}
              {' · '}<a href={image.page} rel="noopener noreferrer">Wikimedia Commons</a>
            </figcaption>
          </figure>
        )}

        <p>{poiDescription(p, paths.map((x) => x.name_sk), locale)}</p>

        <dl className="facts">
          <dt>{t.type}</dt>
          <dd>
            {categoryLabel(p.category, locale)}
            {p.unesco && <span className="badge" title={t.unescoTitle}>UNESCO</span>}
          </dd>
          {p.elevation_m != null && (<><dt>{t.elevation}</dt><dd>{t.elevationValue(p.elevation_m)}</dd></>)}
          {p.protected_area && (<><dt>{t.protectedArea}</dt><dd>{p.protected_area}</dd></>)}
          <dt>{t.coordinates}</dt>
          <dd>{p.lat.toFixed(4)} °N, {p.lon.toFixed(4)} °E {t.approx}</dd>
        </dl>

        <section aria-label={t.placeMapAria}>
          <MapLoader
            texts={mapTexts(locale)}
            label={t.placeMap(name)}
            center={[p.lon, p.lat]}
            zoom={13}
            layers={[{ id: 'poi', kind: 'points', color: paths[0]?.colour ?? '#1f4d3a', data: poiToGeoJSON(p, locale) }]}
          />
        </section>

        {paths.length > 0 && (
          <section>
            <h2>{t.onTrails}</h2>
            <ul className="path-links" id="poi-paths">
              {paths.map((x) => (
                <li key={x.slug}>
                  <span className="swatch" style={{ background: x.colour }} aria-hidden="true" />
                  <Link href={pagePath(locale, 'trail', x.slug)}>{x.name_sk}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <NearbyPois lat={p.lat} lon={p.lon} title={t.nearby(name)} />

        <p>
          <a href={osm} rel="noopener noreferrer">{t.showOnOsm}</a>
          {p.wikidata_id && (<> · <a href={`https://www.wikidata.org/wiki/${p.wikidata_id}`} rel="noopener noreferrer">Wikidata</a></>)}
        </p>
        <p className="note">{t.dataBy(p.attribution ?? t.team, p.licence)}</p>
      </main>
    </>
  );
}
