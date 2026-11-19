// Trail detail (EN, SSG, T2-14). Shares TrailView with /trasy/<slug>/.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TrailView, { trailMetadata } from '@/components/views/TrailView';
import { getPath, getPaths } from '@/lib/paths';

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPaths().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return trailMetadata('en', (await params).slug);
}

export default async function TrailPageEn({ params }: Props) {
  const p = getPath((await params).slug);
  if (!p) notFound();
  return <TrailView locale="en" path={p} />;
}
