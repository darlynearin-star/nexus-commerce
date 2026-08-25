'use client';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import SeoManager from '@/components/SeoManager';

// H12: no global activeStoreSlug seeding. Visitors are bound to a store only
// by explicitly visiting one (StoreShell persists it) or picking one in the
// header switcher — never by an invented default.
export default function ClientProviders({ children }: { children: React.ReactNode }) {
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