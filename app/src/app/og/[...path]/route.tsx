import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { keepShortWordsWithNext, OG_IMAGE_SIZE, ogCard, ogImageRoutes } from '@/lib/og';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
export const dynamicParams = false;

type Params = { params: Promise<{ path: string[] }> };

export function generateStaticParams() {
  return ogImageRoutes().map((r) => ({ path: r.path }));
}

const fontDir = path.join(process.cwd(), 'assets', 'fonts');
const fonts = [
  { name: 'Noto Sans', data: fs.readFileSync(path.join(fontDir, 'NotoSans-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Noto Sans', data: fs.readFileSync(path.join(fontDir, 'NotoSans-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];

export async function GET(_request: Request, { params }: Params) {
  const key = (await params).path.join('/');
  const route = ogImageRoutes().find((r) => r.path.join('/') === key);
  if (!route) return new Response('Not found', { status: 404 });
  const card = ogCard(route.locale, route.kind, route.slug);
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px 56px',
          background: '#eef2ee',
          color: '#14221b',
          fontFamily: 'Noto Sans',
          borderLeft: `28px solid ${card.accent}`,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {['#c62828', '#1565c0', '#2e7d32'].map((c) => (
            <div key={c} style={{ width: 64, height: 14, background: c }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#1f4d3a', letterSpacing: 1 }}>{card.eyebrow}</div>
          <div
            style={{
              fontSize: card.title.length > 32 ? 64 : 80,
              fontWeight: 700,
              lineHeight: 1.08,
              marginTop: 14,
              display: 'block',
              lineClamp: 3,
            }}
          >
            {keepShortWordsWithNext(card.title)}
          </div>
          <div style={{ fontSize: 34, marginTop: 24, color: '#33473c' }}>{keepShortWordsWithNext(card.detail)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700, color: '#1f4d3a' }}>
          <div>{SITE_NAME}</div>
          <div>{host}</div>
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts },
  );
}
