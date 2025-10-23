import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/app-header';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RQ Lead Enricher',
  description: 'Automated lead enrichment system for outbound campaigns',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppHeader />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
