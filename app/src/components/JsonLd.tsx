// Vloží štruktúrované dáta (schema.org) ako <script type="application/ld+json">.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // "<" sa escapuje, aby sa dáta nedali zneužiť na ukončenie <script> značky
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
