// Place page (EN, SSG, T2-14). Shares PlaceView with /miesta/<slug>/.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PlaceView, { placeMetadata } from '@/components/views/PlaceView';
import { getPoi, getPois } from '@/lib/pois';

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPois().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return placeMetadata('en', (await params).slug);
}

export default async function PlacePageEn({ params }: Props) {
  const p = getPoi((await params).slug);
  if (!p) notFound();
  return <PlaceView locale="en" poi={p} />;
}
