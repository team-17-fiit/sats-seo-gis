// Peak page (EN, SSG, T2-14). Shares PeakView with /vrcholy/<slug>/.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PeakView, { peakMetadata } from '@/components/views/PeakView';
import { getPeak, getPeaks } from '@/lib/peaks';

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPeaks().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return peakMetadata('en', (await params).slug);
}

export default async function PeakPageEn({ params }: Props) {
  const peak = getPeak((await params).slug);
  if (!peak) notFound();
  return <PeakView locale="en" peak={peak} />;
}
