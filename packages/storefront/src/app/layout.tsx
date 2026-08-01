'use client';
import { useEffect } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ParticleField from '@/components/Background/ParticleField';
import AnnouncementBanner from '@/components/AnnouncementBanner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.title = 'Adorn — Your Style, Elevated';
    if (!localStorage.getItem('activeStoreSlug')) localStorage.setItem('activeStoreSlug', 'adorn');
  }, []);

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://nexus-api-69q5.onrender.com" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ParticleField />
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
