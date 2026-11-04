'use client';
// Kontajner mapy s pevnou výškou (bez layout shiftu) a tlačidlom, ktoré mapu načíta až na požiadanie.
// Mapu kreslí výhradne cez MapAdapter (ADR-0003) – komponent nevie, či je to MapLibre alebo statický náhľad.
// Kontrakt pre E2E testy: tlačidlo "Zobraziť interaktívnu mapu", #map canvas, #map[data-ready="true"].
import { useEffect, useRef, useState } from 'react';
import type { LayerSpec, LngLat, MapAdapter } from '@/lib/map';

type Status = 'idle' | 'loading' | 'ready' | 'error';

type Props = {
  layers: LayerSpec[];
  center?: LngLat;
  zoom?: number;
  label?: string;
  /** Texty tlačidla v jazyku stránky (T2-14). Posielajú sa ako props, aby slovník nebol v JS bundli. */
  texts?: MapTexts;
  /** Položky legendy: farba trasy + názov; `unesco` = značka UNESCO zastávky (⋆). */
  legend?: LegendItem[];
};

export type MapTexts = { load: string; loading: string; error: string; legend: string };
export type LegendItem = { label: string; color: string; unesco?: boolean };

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
      const map = await createMap();
      mapRef.current = map;
      setKind(map.kind);
      await map.mount(boxRef.current, { center, zoom });
      layers.forEach((l) => map.addLayer(l));
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
                className={it.unesco ? 'map-legend-unesco' : 'map-legend-line'}
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
