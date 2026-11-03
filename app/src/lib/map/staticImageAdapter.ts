// Statický náhľad bez WebGL a bez externých dlaždíc: body a línie ako inline SVG.
// Použije sa na zariadeniach bez WebGL alebo pri "šetrení dát". Rozmery dáva kontajner -> CLS = 0.
import { clusterPoints, resolveClusterOptions, type Cluster, type ScreenPoint } from './cluster';
import type { FeatureCollection, LayerSpec, LngLat, MapAdapter, MapOptions, PointFeature, Unsubscribe } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 1000;
const HEIGHT = 600;

/** Lineárna projekcia lon/lat do súradníc SVG pre danú obálku (dostatočné pre územie SR). */
export function project([lon, lat]: LngLat, bounds: [LngLat, LngLat], w = WIDTH, h = HEIGHT): [number, number] {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  const x = ((lon - minLon) / (maxLon - minLon || 1)) * w;
  const y = h - ((lat - minLat) / (maxLat - minLat || 1)) * h;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

/** Obálka Slovenska s malým okrajom – default, keď vrstvy nemajú vlastné dáta. */
export const SK_BOUNDS: [LngLat, LngLat] = [[16.7, 47.6], [22.7, 49.7]];

export class StaticImageAdapter implements MapAdapter {
  readonly kind = 'static' as const;
  private svg: SVGSVGElement | null = null;
  private handlers = new Set<(id: string) => void>();
  private bounds: [LngLat, LngLat] = SK_BOUNDS;

  async mount(el: HTMLElement, _opts: MapOptions): Promise<void> {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Zjednodušená mapa (bez WebGL)');
    svg.setAttribute('class', 'static-map');
    el.appendChild(svg);
    this.svg = svg;
  }

  setView(_center: LngLat, _zoom: number): void {
    // statický náhľad vždy ukazuje celé územie
  }

  addLayer(spec: LayerSpec): void {
    if (!this.svg || typeof spec.data === 'string') return; // URL dáta static adapter nesťahuje
    if (spec.kind === 'line') {
      for (const f of spec.data.features) {
        const pts = f.geometry.coordinates.map((c) => project(c, this.bounds).join(',')).join(' ');
        const line = document.createElementNS(SVG_NS, 'polyline');
        line.setAttribute('points', pts);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', spec.color);
        line.setAttribute('stroke-width', '4');
        this.svg.appendChild(line);
      }
      return;
    }
    const points: ScreenPoint[] = (spec.data as FeatureCollection<PointFeature>).features.map((f) => {
      const [x, y] = project(f.geometry.coordinates, this.bounds);
      return { id: f.properties.id, x, y, label: f.properties.label ?? f.properties.name };
    });
    // Polomer v jednotkách viewBoxu (1000 × 600) ≈ pixely pri bežnej šírke mapy.
    const cluster = resolveClusterOptions(spec.cluster);
    const groups = cluster ? clusterPoints(points, cluster.radius) : points.map((p) => ({ ...p, count: 1, members: [p] }));

    for (const g of groups) {
      if (g.count === 1) this.drawPoint(this.svg, g.members[0], spec.color);
      else this.drawCluster(this.svg, g, spec.color);
    }
  }

  private drawPoint(svg: SVGSVGElement, p: ScreenPoint, color: string): void {
    const dot = circle(p.x, p.y, 9, color);
    dot.setAttribute('data-id', p.id);
    dot.appendChild(title(p.label));
    dot.addEventListener('click', () => this.handlers.forEach((cb) => cb(p.id)));
    svg.appendChild(dot);
  }

  /** Zhluk: väčší kruh s počtom bodov; názvy sú v <title>. Statický náhľad nemá zoom, preto zhluk nie je klikateľný. */
  private drawCluster(svg: SVGSVGElement, c: Cluster, color: string): void {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-cluster-count', String(c.count));
    g.appendChild(title(c.members.map((m) => m.label).join(', ')));
    g.appendChild(circle(c.x, c.y, c.count < 10 ? 16 : 20, color));
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(c.x));
    text.setAttribute('y', String(c.y));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '15');
    text.setAttribute('font-weight', 'bold');
    text.textContent = String(c.count);
    g.appendChild(text);
    svg.appendChild(g);
  }

  onPoiClick(cb: (id: string) => void): Unsubscribe {
    this.handlers.add(cb);
    return () => this.handlers.delete(cb);
  }

  destroy(): void {
    this.svg?.remove();
    this.svg = null;
    this.handlers.clear();
  }
}

function circle(x: number, y: number, r: number, color: string): SVGCircleElement {
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', String(x));
  c.setAttribute('cy', String(y));
  c.setAttribute('r', String(r));
  c.setAttribute('fill', color);
  c.setAttribute('stroke', '#fff');
  c.setAttribute('stroke-width', '2');
  return c;
}

function title(text: string): SVGTitleElement {
  const t = document.createElementNS(SVG_NS, 'title');
  t.textContent = text;
  return t;
}
