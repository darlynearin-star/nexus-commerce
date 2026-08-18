import { createApiClient, ApiError } from '@nexus/web';

export const { api } = createApiClient({
  apiBase: process.env.NEXT_PUBLIC_API_URL || '',
});

export { ApiError };