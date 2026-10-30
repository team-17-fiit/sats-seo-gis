'use client';
// Doplnkový blok z REST API: POI v okolí zastávky. Ak API nie je nastavené alebo nebeží,
// blok sa jednoducho nezobrazí – stránka ostáva plnohodnotná (static-first).
import { useEffect, useState } from 'react';
import { API_URL, fetchPoisNear, type NearbyPoi } from '@/lib/api';

type Props = { lat: number; lon: number; title: string };

export default function NearbyPois({ lat, lon, title }: Props) {
  const [pois, setPois] = useState<NearbyPoi[] | null>(null);

  useEffect(() => {
    if (!API_URL) return;
    const ctrl = new AbortController();
    fetchPoisNear(lat, lon, 5000, ctrl.signal)
      .then(setPois)
      .catch(() => setPois(null));
    return () => ctrl.abort();
  }, [lat, lon]);

  if (!pois || pois.length === 0) return null;
  return (
    <section aria-label={title} className="nearby">
      <h2>{title}</h2>
      <ul>
        {pois.map((p) => (
          <li key={p.slug}>
            {p.name_sk} <span className="muted">· {p.category} · {(p.distance_m / 1000).toFixed(1)} km</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
