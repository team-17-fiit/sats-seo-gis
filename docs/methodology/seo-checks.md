# SEO a štruktúrované dáta – automatická kontrola (T3-22, T3-04)

**Účel:** každá stránka webu (SK aj EN, všetky typy) spĺňa základné pravidlá SEO a jej štruktúrované
dáta sú platné. Kontrola beží v CI pri každom PR a pred každým nasadením; červená = merge/deploy sa zastaví.
**Pôvod:** spája SEO kontrolu (T3-22, T3-04) a kontrolu adries webu pred nasadením (T3-06, pôvodne
`scripts/check-site-urls.mjs`) – všetky jej pravidlá a testy sú zachované tu.
**Kde:** `app/scripts/seo/` – `audit.mjs` (pravidlá), `jsonld.mjs` (schema.org + Google), `check.mjs` (CLI),
`audit.test.mjs` (unit testy pravidiel), `schemaorg-vocab.json` (slovník schema.org).
**Nadväzuje na:** dokumentácia 5.6 (SEO, SSG a štruktúrované dáta), Z-B.8 (SEO vrstva), KPI K2, K5, K19.

## Ako to funguje

1. `npm run build` vyrobí statický web v `out/`.
2. `npm run test:seo` prečíta **každý** HTML súbor v `out/` tak, ako ho dostane crawler – bez JavaScriptu –
   a rozparsuje ho knižnicou parse5 (cez cheerio), teda rovnakým algoritmom ako prehliadač.
3. Každý nález má úroveň `error` (CI padne) alebo `warn` (vypíše sa, opraví sa podľa priority).
4. Výsledok: výpis v logu, zhrnutie v *Summary* behu GitHub Actions a celý zoznam v artefakte
   `ci-reports/seo-report/seo-report.json`.

Prepínače: `--production` (deploy – zakáže placeholder adresu `example.com`, vyžaduje https),
`--site-url`, `--base-path` (inak z `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_PATH` ako pri builde),
`--out`, `--report`.

## Pravidlá stránky

| Oblasť | Pravidlo (`id`) | Úroveň | Prečo |
|---|---|---|---|
| Jazyk | `html-lang` – `<html lang>` = jazyk podľa adresy (`/en/…` = `en`) | error | WCAG 3.1.1, správne čítanie čítačkou, signál pre vyhľadávače |
| Základ | `charset`, `viewport`, `viewport-zoom` (zákaz zoomu) | error | mobilné vyhľadávanie, WCAG 1.4.4 |
| Indexovanie | `robots-noindex`, `robots-nofollow` na indexovateľnej stránke | error | stránka by z vyhľadávania zmizla |
| Title | `title-missing`, `-multiple`, `-empty`, `-in-body` | error | |
| | `title-length`: < 15 alebo > 70 znakov = error, > 60 = warn | error/warn | Google skracuje ~55–60 znakov (šírka ~600 px) |
| | `title-duplicate` – rovnaký title na dvoch stránkach (aj SK vs. EN) | error | zadanie T3-22: unikátne title |
| | `title-h1-mismatch` – title neobsahuje text H1 | warn | konzistencia výsledku vyhľadávania a stránky |
| Description | `description-missing`, `-multiple`, `-empty`, `-equals-title` | error | |
| | `description-length`: < 70 alebo > 200 = error, > 160 = warn | error/warn | krátky opis Google nahradí výrezom textu, dlhý skráti |
| | `description-duplicate` | error | zadanie T3-22 |
| Nadpisy | `h1-count` – práve jeden H1; `h1-empty`; `h1-duplicate` (v rámci jazyka) | error | zadanie T3-22: jeden H1 |
| | `heading-order` – prvý nadpis je H1, žiadna preskočená úroveň (H2 → H4) | error | štruktúra pre crawler aj čítačku |
| | `main-landmark` – práve jeden `<main>` | error | |
| Canonical | `canonical-missing`, `-multiple`, `-relative`, `-query`, `canonical-self` (= adresa stránky) | error | zadanie T3-22 |
| Hreflang | `hreflang-missing` (sk, en, x-default), `-unexpected`, `-duplicate`, `-relative`, `-code` | error | dokumentácia 5.6.1 |
| | `hreflang-self` (vlastný jazyk = canonical), `hreflang-x-default` (= slovenčina) | error | |
| | `hreflang-target` (cieľ existuje), `-target-lang`, `hreflang-reciprocal` (cieľ odkazuje späť) | error | Google ignoruje nevzájomné hreflang |
| Náhľad pri zdieľaní | `og-missing`, `og-url` (= canonical), `og-locale`, `og-image-*` (existuje, PNG, naozaj 1200×630), `twitter-card`, `twitter-image-*` (existuje, má alt) | error | T3-01 |
| Obrázky | `img-alt-missing` – `<img>`, `<input type=image>`, `<area>` bez `alt` | error | zadanie T3-22: alt texty |
| | `img-alt-filename` („foto_1.jpg“), `img-alt-generic` („obrázok“), `img-alt-link` (obrázok-odkaz s prázdnym alt) | error | alt, ktorý nič nehovorí, je ako žiadny |
| | `role-img-name` – prvok s `role="img"` (SVG mapa) bez `aria-label` | error | |
| | `img-alt-long` (> 150 znakov), `svg-role` | warn | |
| Odkazy | `link-broken` (interný odkaz na neexistujúcu stránku), `link-trailing-slash`, `link-relative`, `link-basepath` | error | crawl bez slepých uličiek a presmerovaní |
| | `link-name` (odkaz bez textu), `link-href` (`#`, `javascript:`) | error | |
| | `link-locale` – odkaz do druhého jazyka bez `hreflang` (smie len prepínač jazyka) | error | |
| Ikona | `favicon-missing`, `favicon-broken` | error | inak 404 na `/favicon.ico` a chyba v konzole |
| 404 | `404-noindex`, `404-canonical` | error | |

## Pravidlá webu

| Pravidlo | Čo overuje |
|---|---|
| `sitemap-missing-page`, `sitemap-broken`, `sitemap-duplicate`, `sitemap-foreign`, `sitemap-404` | sitemap.xml obsahuje presne všetky indexovateľné stránky (rozdiel sitemap ↔ web, dokumentácia 5.6.4) |
| `sitemap-hreflang` | jazykové alternatívy v sitemap = hreflang v HTML stránky |
| `robots-sitemap`, `robots-disallow-all` | robots.txt odkazuje na sitemap na správnej adrese a nezakazuje web |
| `site-url`, `site-url-query` | adresa webu je platná URL bez `?` a `#` |
| `site-url-placeholder`, `site-url-https` | len `--production`: žiadne `example.com`/`localhost`/`127.0.0.1`, len https (dokumentácia Z-B.8) |
| `placeholder-in-html` | len `--production`: `example.com` sa nesmie objaviť nikde v HTML žiadnej stránky |
| `verification-missing` | ak je nastavená premenná `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION`, úvodná stránka má príslušný overovací meta tag (Search Console, Bing) |
| `sitemap-noindex`, `sitemap-hreflang-target` | stránka s noindex nie je v sitemap; hreflang odkazy v sitemap vedú na existujúce stránky |
| `no-pages` | prázdny `out/` je chyba, nie „0 nálezov“ |

## Štruktúrované dáta (T3-04, K19 „100 % Rich Results pass“)

Google Rich Results Test nemá verejné API, preto ho CI nevie zavolať. CI preto overuje to isté, čo by overil človek:

1. **Slovník schema.org** (ako [validator.schema.org](https://validator.schema.org)): každý `@type` existuje;
   každá vlastnosť existuje a patrí k typu vrátane nadtypov (`domainIncludes`); hodnota má povolený typ
   (`rangeIncludes`); žiadne `null` ani prázdne reťazce; `url`/`sameAs` sú absolútne URL; `position` je celé číslo.
   Slovník je uložený v gite (`schemaorg-vocab.json`), aby CI nezáviselo od siete. Aktualizácia:
   `node scripts/seo/build-schemaorg-vocab.mjs`.
2. **Pravidlá Google pre BreadcrumbList** – jediný typ na našich stránkach, pre ktorý Google zobrazuje
   rich výsledok: aspoň 2 položky, pozície 1…n, každá má `name` a `item` (URL), posledná smie `item` vynechať.
3. **Obsahové pravidlá podľa typu stránky** (dokumentácia 5.6, Z-B.8):

| Stránka | Očakávané entity | Kontroly |
|---|---|---|
| úvod | `WebSite` | url = adresa webu, len jedna `WebSite` |
| zoznam trás | `BreadcrumbList`, `ItemList` | počet trás v JSON-LD = počet trás na stránke, pozície 1…n, URL existujú a sú v jazyku stránky |
| trasa | `BreadcrumbList`, `TouristTrip` + `itinerary` (`ItemList` zastávok) | url = canonical, name = H1, zastávky existujú, geo každej zastávky v SR (+ rezerva) |
| miesto | `BreadcrumbList`, `TouristAttraction` (+ konkrétny typ) | url = canonical, name = H1, geo v SR, `sameAs` = Wikidata URL |
| vrchol | `BreadcrumbList`, `Mountain` | url = canonical, name = H1, geo v SR, výška 0–2 655 m |

Každá URL na doméne webu v JSON-LD musí začínať adresou webu vrátane podcesty a lomky
(`jsonld-url-outside`, napr. `https://…github.io/sats-seo-gis` bez lomky je chyba).

Navigačná cesta: začína úvodom jazyka, končí canonical adresou, názov poslednej položky = H1,
všetky položky sú stránky webu v tom istom jazyku. Žiadna URL webu v JSON-LD nesmie viesť na neexistujúcu stránku.

Typy a vlastnosti v stave *pending* kontrola povolí, ale hlási varovanie. Výnimka: `TouristTrip` a
`itinerary` – model trasy, ktorý tím vedome používa (rozhodnutie v [audite](../audits/2026-11-19-seo-audit.md),
bod „Model trasy“; zoznam `ACCEPTED_PENDING` v `jsonld.mjs`).

**Ručná kontrola (raz za šprint, dôkaz pre K19):** jedna stránka každého typu v SK aj EN
v [Rich Results Test](https://search.google.com/test/rich-results) a
[Schema Markup Validator](https://validator.schema.org); screenshot do zápisnice zo sprint review.

## Ako vedieť, že kontrola naozaj kontroluje

`app/scripts/seo/audit.test.mjs` (Vitest, beží v `npm run test:unit`) postaví malý správny web
(5 typov stránok × 2 jazyky) a overí, že má **0 chýb**. Potom ho pre každé pravidlo pokazí práve
na jednom mieste a overí, že sa ozve **presne to pravidlo**. Ak by niekto pravidlo vypol alebo
pokazil, jeho test spadne (overené úmyselným vypnutím `canonical-self` a `html-lang`).

## Pridanie nového pravidla

1. Pravidlo do `audit.mjs` (alebo `jsonld.mjs`) s jasným `id` a správou po slovensky.
2. Test do `audit.test.mjs`: správny web nesmie pravidlo spustiť, pokazený musí.
3. Riadok do tabuľky v tomto dokumente.
