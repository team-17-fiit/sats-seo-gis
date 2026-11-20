// Geometria trasy ako samostatný statický súbor /geo/trasy/<slug>.json (T3-14).
// Predtým išla celá čiara trasy do HTML stránky (props mapy) – až 170 kB HTML, hoci mapa sa
// načíta len po kliknutí. Teraz ju MapLoader stiahne až vtedy (mapa = ostrov, dokumentácia 5.1.2).
import { getPath, getPaths, pathLineGeoJSON } from '@/lib/paths';

export const dynamic = 'force-static';
export const dynamicParams = false;

type Params = { params: Promise<{ file: string }> };

export function generateStaticParams() {
  return getPaths().map((p) => ({ file: `${p.slug}.json` }));
}

export async function GET(_request: Request, { params }: Params) {
  const slug = (await params).file.replace(/\.json$/, '');
  const p = getPath(slug);
  if (!p) return new Response('Not found', { status: 404 });
  return Response.json(pathLineGeoJSON(p));
}
