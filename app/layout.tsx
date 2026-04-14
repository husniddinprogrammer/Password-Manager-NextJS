import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { VaultProvider } from '@/context/VaultContext';
import { SessionProvider } from '@/context/SessionContext';
import PageTransitionWrapper from '@/components/Layout/PageTransitionWrapper';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Vault — Team Password Manager',
  description: 'Secure, encrypted password management for teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased">
        <VaultProvider>
          <SessionProvider>
            <PageTransitionWrapper>
              {children}
            </PageTransitionWrapper>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1a1a27',
                  color: '#f1f5f9',
                  border: '1px solid #2a2a3f',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: { primary: '#22c55e', secondary: '#1a1a27' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#1a1a27' },
                },
              }}
            />
          </SessionProvider>
        </VaultProvider>
      </body>
    </html>
  );
}
