import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

// Same two fonts as before, now self-hosted by Next.js (no request to Google when a page opens).
// Variable fonts cover every weight the site uses (Inter 400–900, Devanagari 400–700).
// The CSS variables are used by --font in globals.css and by the poster canvas (lib/qr-client.js).
const inter = Inter({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-inter' });
const devanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], display: 'swap', variable: '--font-noto', preload: false });

export const metadata = {
  title: 'Smart Review Agent',
  description: 'Share your feedback in under a minute.',
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${devanagari.variable}`}>
      <body>{children}</body>
    </html>
  );
}
