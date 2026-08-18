import StoreShell from '@/components/StoreShell';
import { fetchPublicStore } from '@/lib/server-data';

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: { storeSlug: string } }) {
  const storeSlug = params.storeSlug;
  const store = await fetchPublicStore(storeSlug);

  return (
    <StoreShell store={store} slug={storeSlug}>
      {children}
    </StoreShell>
  );
}