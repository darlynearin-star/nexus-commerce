import { createApiClient, ApiError } from '@nexus/web';

export const { api, request: apiClient } = createApiClient({
  apiBase: process.env.NEXT_PUBLIC_API_URL || '',
  includeStoreSlug: true,
  preserveExistingStoreSlug: true,
});

export { ApiError };