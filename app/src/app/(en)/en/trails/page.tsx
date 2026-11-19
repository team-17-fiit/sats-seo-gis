// Thematic trails overview (EN, T2-14). Shares TrailsView with /trasy/.
import TrailsView, { trailsMetadata } from '@/components/views/TrailsView';

export const metadata = trailsMetadata('en');

export default function TrailsPageEn() {
  return <TrailsView locale="en" />;
}
