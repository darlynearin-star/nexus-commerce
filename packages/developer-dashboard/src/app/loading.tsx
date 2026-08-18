'use client';
export default function Loading() {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton" style={{ height: 32, width: '40%' }} />
      <div className="skeleton" style={{ height: 16, width: '25%' }} />
      <div className="skeleton" style={{ height: 180 }} />
    </div>
  );
}