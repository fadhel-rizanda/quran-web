import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

import SessionProvider from '@/context/SessionProvider';
import { SettingsProvider } from '@/context/SettingsContext';
import { BookmarkProvider } from '@/context/BookmarkContext';
import { QuranProvider } from '@/context/QuranContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const scheherazade = localFont({
  src: [
    {
      path: '../../public/fonts/ScheherazadeNew-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ScheherazadeNew-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-scheherazade',
});

export const metadata: Metadata = {
  title: 'Personal Quran App',
  description: 'An offline-first stacked vertical layout Al-Quran reader with custom folder bookmark views and cloud sync support.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${scheherazade.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
        <SessionProvider>
          <SettingsProvider>
            <BookmarkProvider>
              <QuranProvider>
                {children}
              </QuranProvider>
            </BookmarkProvider>
          </SettingsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
