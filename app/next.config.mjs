// Next.js konfigurácia
// output: 'export'  -> `next build` vygeneruje čisté statické HTML do priečinka out/
//                      (žiadny Node server za behu; ide na CDN a do PWA/Capacitor shellu).
// trailingSlash     -> /vrcholy/rysy/ namiesto /vrcholy/rysy (stabilné URL pre SEO).
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }, // statický export nepodporuje optimalizáciu obrázkov za behu
};
export default nextConfig;
