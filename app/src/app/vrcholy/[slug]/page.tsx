// Podstránka vrcholu (SK, SSG). Obsah je v PeakView, ktorý zdieľa aj /en/peaks/<slug>/.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PeakView, { peakMetadata } from '@/components/views/PeakView';
import { getPeak, getPeaks } from '@/lib/peaks';

export const dynamicParams = false; // iné adresy ako vygenerované vrátia 404

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPeaks().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return peakMetadata('sk', (await params).slug);
}

export default async function PeakPage({ params }: Props) {
  const peak = getPeak((await params).slug);
  if (!peak) notFound();
  return <PeakView locale="sk" peak={peak} />;
}
