// Root layout slovenskej časti webu (/, /trasy/, /miesta/, /vrcholy/): <html lang="sk">.
import RootDocument, { rootMetadata, rootViewport } from '@/components/RootDocument';

export const metadata = rootMetadata('sk');
export const viewport = rootViewport;

export default function SkLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument locale="sk">{children}</RootDocument>;
}
