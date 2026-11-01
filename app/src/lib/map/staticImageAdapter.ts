// Statický náhľad bez WebGL a bez externých dlaždíc: body a línie ako inline SVG.
// Použije sa na zariadeniach bez WebGL alebo pri "šetrení dát". Rozmery dáva kontajner -> CLS = 0.
import type {
  FeatureCollection, LayerSpec, LineFeature, LngLat, MapAdapter, MapOptions, PointFeature, Unsubscribe,
} from './types';

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
    if (this.svg && spec.kind === 'line' && typeof spec.data === 'string') {
      // čiara trasy z URL (/data/geom/<slug>.json) – malý súbor, stiahni a nakresli
      fetch(spec.data)
        .then((r) => r.json() as Promise<FeatureCollection<LineFeature>>)
        .then((data) => this.addLayer({ ...spec, data }))
        .catch((err) => console.warn('Čiaru trasy sa nepodarilo načítať:', err));
      return;
    }
    if (!this.svg || typeof spec.data === 'string') return; // URL bodov static adapter nesťahuje
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
    for (const f of (spec.data as FeatureCollection<PointFeature>).features) {
      const [x, y] = project(f.geometry.coordinates, this.bounds);
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(y));
      dot.setAttribute('r', '9');
      dot.setAttribute('fill', spec.color);
      dot.setAttribute('stroke', '#fff');
      dot.setAttribute('stroke-width', '2');
      dot.setAttribute('data-id', f.properties.id);
      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = f.properties.label ?? f.properties.name;
      dot.appendChild(title);
      dot.addEventListener('click', () => this.handlers.forEach((cb) => cb(f.properties.id)));
      this.svg.appendChild(dot);
    }
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
