'use client';
import { useState, useRef, useEffect } from 'react';

export default function FieldInfo({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button type="button" onClick={() => setOpen(p => !p)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '0.375rem', color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.75rem', lineHeight: 1 }}>
        ℹ
      </button>
      {open && (
        <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', zIndex: 50, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', fontSize: '0.75rem', maxWidth: 280, lineHeight: 1.4, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {text}
        </div>
      )}
    </span>
  );
}
