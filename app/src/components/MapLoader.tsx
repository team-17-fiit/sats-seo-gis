'use client';
// Kontajner mapy s pevnou výškou (bez layout shiftu) a tlačidlom, ktoré mapu načíta až na požiadanie.
// Kontrakt pre E2E testy: tlačidlo "Zobraziť interaktívnu mapu", #map canvas, #map[data-ready="true"].
import { useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'loading' | 'map' | 'ready' | 'error';

export default function MapLoader() {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ remove(): void } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    setHydrated(true); // tlačidlo je do hydratácie vypnuté, aby klik nepadol "do prázdna"
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  async function load() {
    if (!boxRef.current) return;
    setStatus('loading');
    try {
      const { createPeakMap } = await import('@/lib/peakMap');
      mapRef.current = createPeakMap(boxRef.current, () => setStatus('ready'));
      setStatus('map');
    } catch (err) {
      // napr. chýba WebGL alebo výpadok siete: vráť tlačidlo, nech sa dá skúsiť znova
      console.error('Mapu sa nepodarilo načítať:', err);
      setStatus('error');
    }
  }

  const showButton = status === 'idle' || status === 'loading' || status === 'error';
  const label =
    status === 'loading' ? 'Načítavam mapu…'
    : status === 'error' ? 'Mapu sa nepodarilo načítať – skúsiť znova'
    : 'Zobraziť interaktívnu mapu';

  return (
    <div id="map" ref={boxRef} className="map-box" data-ready={status === 'ready' ? 'true' : undefined}>
      {showButton && (
        <button id="load-map" type="button" onClick={load} disabled={!hydrated || status === 'loading'}>
          {label}
        </button>
      )}
    </div>
  );
}
