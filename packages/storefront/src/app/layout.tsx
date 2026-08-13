'use client';
import { useEffect } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBanner from '@/components/AnnouncementBanner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.title = 'Lyn-nyx Stores — Shop, Sell, Scale';
    if (!localStorage.getItem('activeStoreSlug')) localStorage.setItem('activeStoreSlug', 'adorn');
  }, []);

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://nexus-api-69q5.onrender.com" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AnnouncementBanner />
            <Header />
            <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative', zIndex: 1 }}>{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}