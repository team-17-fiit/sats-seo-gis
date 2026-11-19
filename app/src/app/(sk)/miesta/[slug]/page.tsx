// Stránka miesta (SK, SSG, T2-10). Obsah je v PlaceView, ktorý zdieľa aj /en/places/<slug>/.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PlaceView, { placeMetadata } from '@/components/views/PlaceView';
import { getPoi, getPois } from '@/lib/pois';

export const dynamicParams = false; // iné adresy ako vygenerované vrátia 404

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPois().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return placeMetadata('sk', (await params).slug);
}

export default async function PoiPage({ params }: Props) {
  const p = getPoi((await params).slug);
  if (!p) notFound();
  return <PlaceView locale="sk" poi={p} />;
}
