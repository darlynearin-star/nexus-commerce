import StoreHomeClient from '@/components/StoreHomeClient';
import { fetchStoreHome } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function StoreHomePage({ params }: { params: { storeSlug: string } }) {
  const storeSlug = params.storeSlug;
  const { featured, newArrivals, categories } = await fetchStoreHome(storeSlug);

  return (
    <StoreHomeClient
      initialFeatured={featured}
      initialNewArrivals={newArrivals}
      initialCategories={categories}
    />
  );
}