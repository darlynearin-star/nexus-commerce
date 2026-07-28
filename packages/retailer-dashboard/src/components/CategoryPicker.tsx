'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Cat { id: string; name: string; slug: string; parentId: string | null; children?: Cat[]; }

function buildTree(cats: Cat[]): Cat[] {
  const map = new Map<string, Cat>();
  const roots: Cat[] = [];
  cats.forEach(c => map.set(c.id, { ...c, children: [] }));
  cats.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children!.push(node);
    else roots.push(node);
  });
  return roots;
}

function flattenTree(nodes: Cat[], depth = 0): { id: string; label: string; depth: number }[] {
  const result: { id: string; label: string; depth: number }[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, label: n.name, depth });
    if (n.children) result.push(...flattenTree(n.children, depth + 1));
  }
  return result;
}

export default function CategoryPicker({ categories, selectedId, onChange }: { categories: { id: string; label: string; depth: number }[]; selectedId: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const selected = categories.find(c => c.id === selectedId);
  const filtered = search.trim()
    ? categories.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
    : categories;
  const grouped = buildTree(
    categories.map(c => ({ id: c.id, name: c.label, slug: '', parentId: categories.find(p => p.depth === c.depth - 1 && categories.indexOf(p) < categories.indexOf(c))?.id || null }))
  );

  function findParentId(catId: string): string | null {
    const c = categories.find(c => c.id === catId);
    if (!c || c.depth === 0) return null;
    for (let i = categories.indexOf(c) - 1; i >= 0; i--) {
      if (categories[i].depth === c.depth - 1) return categories[i].id;
    }
    return null;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: selected ? 'inherit' : 'var(--text-secondary)', textAlign: 'left' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? selected.label : 'Select a category...'}</span>
        <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.5 }} />
      </button>

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, maxHeight: '80vh', background: 'var(--bg-card)', borderRadius: '1rem 1rem 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <Search size={18} style={{ opacity: 0.4 }} />
              <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'var(--bg)', padding: '0.375rem 0.5rem', borderRadius: '0.375rem', fontSize: '1rem', color: 'inherit' }} />
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}><X size={20} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
            {filtered.length === 0 && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No categories found</p>}
            {filtered.map(c => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.625rem 1rem', paddingLeft: `${1 + c.depth * 1.25}rem`, border: 'none', background: c.id === selectedId ? 'var(--primary)' : 'transparent', color: c.id === selectedId ? 'white' : 'inherit', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid var(--border)' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>}
    </>
  );
}
