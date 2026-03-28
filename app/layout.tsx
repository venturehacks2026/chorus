import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Sidebar from '@/components/Sidebar';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Chorus',
  description: 'AI agent orchestration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={dmSans.variable}>
      <body className="bg-bg text-text font-sans antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-hidden flex flex-col">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
