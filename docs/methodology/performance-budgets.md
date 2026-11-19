# Výkonnostné budgety a ich kontrola v CI (T3-14, S3-5)

**Účel:** CI stráži nielen skóre Lighthouse, ale aj konkrétne čísla – Core Web Vitals a veľkosť toho, čo
web posiela. Zhoršenie nad budget = červené CI = PR sa nemerguje.
**Nadväzuje na:** KPI K1–K4 (tabuľka 2.2), cieľ Z3 (LCP ≤ 2,5 s a CLS ≤ 0,1 na mobile), dokumentácia
5.1 (mapa ako ostrov, tabuľka 5.2), 5.7.2 (budgety pre každú URL), 5.8 (CI brány), riziko R1.
**Jediný zdroj čísel:** `app/lighthouse/budgets.cjs` – používa ho Lighthouse CI aj Playwright.

## Budgety

| Metrika | Budget | Zdroj | Nameraný stav 19. 11. 2026 |
|---|---|---|---|
| Lighthouse Performance / Accessibility / Best Practices / SEO | ≥ 80 (medián) | K1, K2 | desktop 97–100 / 100 / 100 / 100; mobil 83–99 / 100 / 100 / 100 (odhad s gzip, pozri Lokálne meranie) |
| LCP | ≤ 2 500 ms | K3 | desktop 0,7–0,9 s; mobil 1,9–2,4 s (Lighthouse, odhad s gzip), 0,8–2,1 s (Playwright) |
| CLS | ≤ 0,1 | K4 | 0 na všetkých stránkach; po načítaní mapy ≤ 0,008 |
| TBT (laboratórna náhrada INP) | ≤ 200 ms | K3, testing.md | desktop 0–115 ms; **mobil 107–596 ms** (pozri Známe nedostatky) |
| FCP | ≤ 1 800 ms | web.dev „dobrá“ hranica | desktop ~0,3 s; mobil ~0,8 s |
| JS pri načítaní (gzip) | ≤ 125 kB | nameraných 106 kB + rezerva | 105–106 kB |
| JS, ktorý pribudne s mapou MapLibre | ≤ 215 kB | tabuľka 5.2: ≈ 210 kB | 203 kB |
| JS spolu s interaktívnou mapou | ≤ 360 kB | | 311 kB |
| HTML dokument (gzip) | ≤ 15 kB | | 4–7 kB (predtým až 46 kB) |
| Všetko pri načítaní (gzip) | ≤ 200 kB | | ~120 kB |
| Počet požiadaviek | ≤ 25 | | 12 (predtým 27) |
| Cudzie domény pri načítaní | 0 | mapa a dlaždice až po kliknutí | 0 |
| Chyby v konzole, nekomprimované texty | 0 | Best Practices | 0 |

Veľkostné budgety = nameraný stav + rezerva ~15 %. **Zvýšiť budget smie len vedomé rozhodnutie
zdôvodnené v popise PR** (napr. nová funkcia, ktorá to potrebuje), nie „aby CI prešlo“.

## Kde a ako sa merajú

| Kontrola | Čo meria | Profil | Agregácia | Kde |
|---|---|---|---|---|
| Lighthouse CI – desktop | všetko z tabuľky okrem mapy | desktop preset | 3 behy; CWV a veľkosti = **najhorší** beh (dok. 5.7.2: x75 z 3 behov = maximum), skóre = medián | job `lighthouse`, `npm run lhci` |
| Lighthouse CI – mobil | to isté | Moto G Power, Slow 4G, CPU 4× | 5 behov, **medián** (dok. obr. 5.8); TBT len varovanie | job `lighthouse`, `npm run lhci:mobile` |
| Playwright `budgets.spec.js` | skutočné LCP a CLS (PerformanceObserver), JS gzip, chyby v konzole na **každej stránke trasy** (7 × SK/EN) + úvod, zoznam, miesto, vrchol | Pixel 7, CPU 4×, Slow 4G (CDP) | jeden beh, každá stránka zvlášť | job `quality-gate`, `npm run test:budgets` |
| Playwright – po kliknutí na mapu | kontajner mapy sa nepohne, CLS po načítaní, JS s MapLibre ≤ 215 kB, statický náhľad nesťahuje MapLibre | to isté | | `budgets.spec.js` |

Meria sa 6 typov stránok: `/`, `/trasy/`, `/trasy/hlavna-os/` (najdlhšia trasa), `/miesta/devin/`,
`/vrcholy/rysy/`, `/en/trails/cesta-marie/`. Lighthouse na mapu neklikne, preto ju meria Playwright –
mapa je najčastejšia príčina zlého LCP/CLS (dokumentácia 5.1.1, riziko R1).

## Lokálne meranie

`npm run preview` spúšťa `app/scripts/preview.mjs`, ktorý komprimuje gzipom ako GitHub Pages
(predtým `serve` posielal prehliadaču nekomprimované súbory, JS vychádzal 360 kB namiesto 106 kB).

**Pozor na firemné počítače:** bezpečnostný softvér niektorých staníc dekomprimuje aj lokálnu prevádzku
prehliadača (v odpovedi sa objaví hlavička `X-Content-Encoding-Over-Network`). Lighthouse potom lokálne
hlási ~3× väčší JS a mobilné LCP ~3,3 s namiesto ~1,9 s. Smerodajné je CI (GitHub runner nič nezachytáva).
Playwright test veľkosti JS je od toho nezávislý – gzip veľkosť počíta zo súborov v `out/`, ktoré stránka
načítala.

## Opravy vykonané pri zavedení budgetov

| Problém | Dopad | Oprava |
|---|---|---|
| `<Link>` prednačítaval (prefetch) dáta každého viditeľného odkazu – úvod sťahoval dáta všetkých 7 trás | úvod 27 požiadaviek, ~1 MB | `prefetch={false}` na odkazoch: 12 požiadaviek, ~390 kB (bez gzip) / ~120 kB (gzip) |
| geometria trasy bola v HTML stránky (props mapy), hoci mapa sa načíta až po kliknutí | HTML trasy až 169 kB (46 kB gzip), FCP mobil 1,6 s | geometria v `/geo/trasy/<slug>.json`, stiahne sa s mapou: HTML 35 kB (6,7 kB gzip), FCP 0,9 s |
| chýbajúca favicona | 404 v konzole, Best Practices 96 | `<link rel="icon">`: Best Practices 100 |
| lokálny server nekomprimoval | merania nezodpovedali produkcii | `scripts/preview.mjs` s gzip |

## Známe nedostatky a odporúčania

1. **TBT na mobile 107–596 ms (budget 200 ms).** Dlhé úlohy sú hydratácia React/Next.js
   (`chunks/255-*.js` ~150 + 116 ms pri CPU 4×) a spracovanie RSC dát vložených v HTML (~170 ms).
   Hodnota silno kolíše aj na tej istej stránke, preto je v mobilnom Lighthouse zatiaľ len varovanie
   (na desktope je brána). Návrh úlohy: zmenšiť hydratovaný strom – zoznamy zastávok a vrcholov
   renderovať bez klientskych komponentov, `ThemeToggle` a `MapLoader` ako jediné ostrovy;
   potom TBT na mobile prepnúť na `error`.
2. **INP v teréne** (K3: INP ≤ 200 ms p75) laboratórium nezmeria – patrí do PSI/WPT dashboardu (US-12, 9-4L).
3. Rezervy budgetov prehodnotiť po každom väčšom update Next.js alebo MapLibre.
