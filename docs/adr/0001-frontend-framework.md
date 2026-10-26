# ADR-0001: Frontend – React s Next.js (statický export)

- **Stav:** prijaté
- **Dátum:** 2026-10-26
- **Rozhoduje:** tím SATS-SEO-GIS

## Kontext

Projekt má byť SEO-compliant a spĺňať Core Web Vitals (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1) a Lighthouse ≥ 80.
Tím chce používať **React**. Prototyp bol čistý Vite + JavaScript s jednou stránkou. Vyhľadávače musia dostať
hotové HTML pre každý vrchol a trasu (crawlovateľné URL), nielen prázdny `<div id="root">`, ktorý
čistá React SPA vracia.

## Zvažované možnosti

1. **Vite + React SPA** – najjednoduchšie, ale obsah vzniká až v prehliadači. Zlé pre SEO a LCP podstránok.
2. **Vite + React + pred-renderovanie (vite-react-ssg)** – ľahšie, zachová Vite, menšia komunita a dokumentácia.
3. **Next.js (App Router) so statickým exportom** – React, SSG cez `generateStaticParams`, Metadata API pre
   canonical/Open Graph, `sitemap.ts`, `robots.ts`. Výstup je čisté statické HTML.
4. **Astro** – výborné pre SSG, ale tím chce React ako hlavný model.

## Rozhodnutie

Používame **možnosť 3**: Next.js s `output: 'export'`. Stránky vrcholov a trás sa generujú pri builde z dát,
mapa (MapLibre GL JS) je klientsky komponent načítaný až po kliknutí.

## Dôsledky

- (+) Crawlovateľné HTML pre každú URL, schema.org dáta, automatická sitemap a robots.
- (+) Statický výstup ide na CDN a do PWA/Capacitor shellu, bez Node servera za behu.
- (+) Veľká komunita a dokumentácia, vhodné pre tím so začiatočníkmi.
- (−) Základný JS balík je väčší než pri Vite (~100 kB first load). Treba strážiť TBT/LCP cez Lighthouse CI.
- (−) Nepoužiť funkcie vyžadujúce server (API routes, ISR, middleware). Partner API pôjde do `backend/`.
- Migrácia na možnosť 2 je možná, ak sa rozpočet JS ukáže ako problém: komponenty sú čistý React.
