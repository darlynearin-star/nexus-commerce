import StoreShopPage from './page.client';
import { fetchStoreShop } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function StoreShop({ params, searchParams }: {
  params: { storeSlug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const storeSlug = params.storeSlug;
  const { products, totalPages, categories } = await fetchStoreShop(storeSlug, searchParams);

  return (
    <StoreShopPage
      initialProducts={products}
      initialTotalPages={totalPages}
      initialCategories={categories}
    />
  );
}