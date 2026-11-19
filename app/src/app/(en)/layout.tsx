// Root layout of the English part of the site (/en/...): <html lang="en">.
import RootDocument, { rootMetadata, rootViewport } from '@/components/RootDocument';

export const metadata = rootMetadata('en');
export const viewport = rootViewport;

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument locale="en">{children}</RootDocument>;
}
