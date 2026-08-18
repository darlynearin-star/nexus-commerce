import { createApiClient, ApiError } from '@nexus/web';

export const { api } = createApiClient({
  apiBase: process.env.NEXT_PUBLIC_API_URL || '',
  uploadBase: process.env.NEXT_PUBLIC_UPLOAD_URL || 'https://nexus-api-69q5.onrender.com',
  includeStoreSlug: true,
});

export { ApiError };