'use client';
// Kontajner mapy s pevnou výškou (bez layout shiftu) a tlačidlom, ktoré mapu načíta až na požiadanie.
// Mapu kreslí výhradne cez MapAdapter (ADR-0003) – komponent nevie, či je to MapLibre alebo statický náhľad.
// Kontrakt pre E2E testy: tlačidlo "Zobraziť interaktívnu mapu", #map canvas, #map[data-ready="true"].
import { useEffect, useRef, useState } from 'react';
import type { FeatureCollection, LayerSpec, LineFeature, LngLat, MapAdapter } from '@/lib/map';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Čiara trasy môže prísť ako URL (`dataUrl`) – stiahne sa až po kliknutí na mapu, nie je v HTML
 * (T3-14: geometria trasy zväčšovala HTML stránky až na 170 kB). Adaptéry dostanú vždy hotové dáta.
 */
export type LineLayerFromUrl = Omit<Extract<LayerSpec, { kind: 'line' }>, 'data'> & { dataUrl: string };
export type LoaderLayer = LayerSpec | LineLayerFromUrl;

async function resolveLayer(l: LoaderLayer): Promise<LayerSpec> {
  if (!('dataUrl' in l)) return l;
  const res = await fetch(l.dataUrl);
  if (!res.ok) throw new Error(`${l.dataUrl}: HTTP ${res.status}`);
  const { dataUrl: _url, ...rest } = l;
  return { ...rest, data: (await res.json()) as FeatureCollection<LineFeature> };
}

type Props = {
  layers: LoaderLayer[];
  center?: LngLat;
  zoom?: number;
  label?: string;
  /** Texty tlačidla v jazyku stránky (T2-14). Posielajú sa ako props, aby slovník nebol v JS bundli. */
  texts?: MapTexts;
  /** Položky legendy: farba trasy + názov; `unesco` = značka UNESCO zastávky (⋆). */
  legend?: LegendItem[];
};

export type MapTexts = { load: string; loading: string; error: string; legend: string };
/** `kind`: 'line' = trasa (predvolené), 'point' = bod miesta alebo vrcholu; `unesco` = značka UNESCO (⋆). */
export type LegendItem = { label: string; color: string; unesco?: boolean; kind?: 'line' | 'point' };

const SK_TEXTS: MapTexts = {
  load: 'Zobraziť interaktívnu mapu',
  loading: 'Načítavam mapu…',
  error: 'Mapu sa nepodarilo načítať – skúsiť znova',
  legend: 'Legenda',
};

export default function MapLoader({ layers, center = [19.7, 48.7], zoom = 6.5, label = 'Mapa', texts = SK_TEXTS, legend = [] }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapAdapter | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [kind, setKind] = useState<string>();

  useEffect(() => {
    setHydrated(true); // tlačidlo je do hydratácie vypnuté, aby klik nepadol "do prázdna"
    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  async function load() {
    if (!boxRef.current) return;
    setStatus('loading');
    try {
      const { createMap } = await import('@/lib/map/createMap');
      // knižnica mapy a dáta vrstiev sa sťahujú súbežne
      const [map, resolved] = await Promise.all([createMap(), Promise.all(layers.map(resolveLayer))]);
      mapRef.current = map;
      setKind(map.kind);
      await map.mount(boxRef.current, { center, zoom });
      resolved.forEach((l) => map.addLayer(l));
      setStatus('ready');
    } catch (err) {
      // napr. výpadok siete pri sťahovaní štýlu: vráť tlačidlo, nech sa dá skúsiť znova
      console.warn('Mapu sa nepodarilo načítať:', err);
      mapRef.current?.destroy();
      mapRef.current = null;
      setStatus('error');
    }
  }

  const showButton = status !== 'ready';
  const text =
    status === 'loading' ? texts.loading
    : status === 'error' ? texts.error
    : texts.load;

  return (
    <>
      <div
        id="map"
        ref={boxRef}
        className="map-box"
        aria-label={label}
        data-ready={status === 'ready' ? 'true' : undefined}
        data-adapter={kind}
      >
        {showButton && (
          <button id="load-map" type="button" onClick={load} disabled={!hydrated || status === 'loading'}>
            {text}
          </button>
        )}
      </div>
      {/* Legenda (obr. Z-H.8) je v HTML už pri builde – nič sa neposúva, platí pre MapLibre aj statický náhľad. */}
      {legend.length > 0 && (
        <ul className="map-legend" id="map-legend" aria-label={texts.legend}>
          {legend.map((it) => (
            <li key={it.label}>
              <span
                className={it.unesco ? 'map-legend-unesco' : it.kind === 'point' ? 'map-legend-point' : 'map-legend-line'}
                style={{ background: it.color }}
                aria-hidden="true"
              />
              {it.label}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
