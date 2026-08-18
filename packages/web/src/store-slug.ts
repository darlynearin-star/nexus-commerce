export function getStoreSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/store\/([^/]+)/);
  return m ? m[1] : null;
}

export function getActiveStoreSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('activeStoreSlug') || getStoreSlugFromUrl();
}