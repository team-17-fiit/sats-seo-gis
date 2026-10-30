// Tenký klient pre REST API (backend/, /api/v1). Používa sa len v prehliadači pre doplnkové dáta;
// SEO obsah stránok nikdy nezávisí od API (je vygenerovaný pri builde).
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export type NearbyPoi = {
  slug: string;
  name_sk: string;
  category: string;
  distance_m: number;
  licence: string;
};

export function nearUrl(lat: number, lon: number, radius = 5000, base = API_URL): string {
  const params = new URLSearchParams({ near: `${lat.toFixed(5)},${lon.toFixed(5)}`, r: String(radius), limit: '10' });
  return `${base}/api/v1/pois?${params}`;
}

export async function fetchPoisNear(lat: number, lon: number, radius = 5000, signal?: AbortSignal): Promise<NearbyPoi[]> {
  if (!API_URL) return [];
  const res = await fetch(nearUrl(lat, lon, radius), { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
