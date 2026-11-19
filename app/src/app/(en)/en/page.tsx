// Home page (EN, T2-14). Shares HomeView with the Slovak home page /.
import HomeView, { homeMetadata } from '@/components/views/HomeView';

export const metadata = homeMetadata('en');

export default function HomePageEn() {
  return <HomeView locale="en" />;
}
