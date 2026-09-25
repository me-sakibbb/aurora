import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Bengali } from 'next/font/google';
import Script from 'next/script';
import { Providers } from './providers';
import { StylesProvider } from './styles-provider';
import './globals.css';

// PLACEHOLDER font until the final Bengali font is chosen (see packages/tokens).
const sans = Noto_Sans_Bengali({
  subsets: ['bengali', 'latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aurora',
  description: 'Aurora',
  robots: { index: false, follow: false }, // Closed beta.
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F4F1EA',
};

const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <StylesProvider>
          <Providers>{children}</Providers>
        </StylesProvider>
        {clarityProjectId && process.env.NODE_ENV === 'production' ? (
          // Usage analytics (F14). The backend team owns the Clarity project; we only load it.
          <Script id="clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(clarityProjectId)});`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
