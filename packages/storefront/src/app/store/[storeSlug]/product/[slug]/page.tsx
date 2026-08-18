import StoreProductClient from '@/components/StoreProductClient';
import { fetchStoreProduct } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function StoreProductPage({ params }: { params: { storeSlug: string; slug: string } }) {
  const { storeSlug, slug } = params;
  const product = await fetchStoreProduct(storeSlug, slug);

  return (
    <StoreProductClient initialProduct={product} slug={slug} storeSlug={storeSlug} />
  );
}