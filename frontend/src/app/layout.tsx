import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KPSS Master AI',
  description: 'Yapay Zeka Destekli KPSS Hazırlık',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
