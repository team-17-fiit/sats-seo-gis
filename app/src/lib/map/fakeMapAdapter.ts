// Falošná implementácia pre unit testy (TestContext z kap. 5.1.4): zaznamenáva volania.
import type { LayerSpec, LngLat, MapAdapter, MapOptions, Unsubscribe } from './types';

export class FakeMapAdapter implements MapAdapter {
  readonly kind = 'fake' as const;
  mounted: MapOptions | null = null;
  view: { center: LngLat; zoom: number } | null = null;
  layers: LayerSpec[] = [];
  destroyed = false;
  private handlers = new Set<(id: string) => void>();

  async mount(_el: HTMLElement, opts: MapOptions): Promise<void> {
    this.mounted = opts;
    this.view = { center: opts.center, zoom: opts.zoom };
  }

  setView(center: LngLat, zoom: number): void {
    this.view = { center, zoom };
  }

  addLayer(spec: LayerSpec): void {
    this.layers.push(spec);
  }

  onPoiClick(cb: (id: string) => void): Unsubscribe {
    this.handlers.add(cb);
    return () => this.handlers.delete(cb);
  }

  /** Testovacia pomôcka: nasimuluje klik na POI. */
  click(id: string): void {
    this.handlers.forEach((cb) => cb(id));
  }

  destroy(): void {
    this.destroyed = true;
    this.handlers.clear();
  }
}
