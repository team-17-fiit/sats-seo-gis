# ADR-0002: Mobilné doručenie – PWA + TWA + Capacitor

- **Stav:** navrhnuté
- **Dátum:** 2026-10-30
- **Rozhoduje:** tím SATS-SEO-GIS

## Kontext

Zadanie chce web aj mobilné aplikácie (Android, iOS) a KPI K11 (offline shell) a K21 (PWA + TWA + iOS).
Tím je malý, frontend je React/Next.js so statickým exportom (ADR-0001).

## Zvažované možnosti

1. PWA only – žiadna práca s obchodmi, najslabší offline/install UX.
2. **PWA + TWA (Bubblewrap) + Capacitor** – jeden kód, Play Store cez TWA, iOS cez Capacitor shell nad tým istým `out/`.
3. Expo / React Native – natívne UI, ale druhý renderovací stack a SEO web zvlášť.
4. Flutter / natívne Kotlin + Swift – samostatné kódy, mimo rozpočet študentského tímu.

## Rozhodnutie

Možnosť 2. V ZS iba **PWA základ** (web manifest, ikony, `display: standalone`); service worker a offline
balíček regiónu v 4-4Z; TWA a Capacitor v LS.

## Dôsledky

- (+) Jeden build (`app/out/`) pre web aj obe platformy.
- (+) SEO stránky a aplikácia sú to isté URL.
- (−) Obmedzený prístup k natívnym API na iOS; riešiť Capacitor pluginmi.
