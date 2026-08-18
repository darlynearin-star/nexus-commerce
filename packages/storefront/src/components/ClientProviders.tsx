'use client';
import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import SeoManager from '@/components/SeoManager';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!localStorage.getItem('activeStoreSlug')) localStorage.setItem('activeStoreSlug', 'adorn');
  }, []);

  return (
    <>
      <SeoManager />
      <ThemeProvider>
        <AuthProvider>
          <AnnouncementBanner />
          <Header />
          <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative', zIndex: 1 }}>{children}</main>
          <Footer />
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}