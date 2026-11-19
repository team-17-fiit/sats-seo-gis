// Prehľad tematických trás (SK). Obsah je v TrailsView, ktorý zdieľa aj /en/trails/.
import TrailsView, { trailsMetadata } from '@/components/views/TrailsView';

export const metadata = trailsMetadata('sk');

export default function PathsPage() {
  return <TrailsView locale="sk" />;
}
