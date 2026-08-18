'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>{error.message || 'An unexpected error occurred'}</p>
      <button className="btn btn-primary" onClick={reset}>Try again</button>
    </div>
  );
}