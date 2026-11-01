// Úvodná stránka (SK). Obsah je v HomeView, ktorý zdieľa aj anglická verzia /en/.
import HomeView, { homeMetadata } from '@/components/views/HomeView';

export const metadata = homeMetadata('sk');

export default function HomePage() {
  return <HomeView locale="sk" />;
}
