'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, X, ArrowLeft } from 'lucide-react';
import { categoryIcon } from '@/lib/category-icons';

interface Cat { id: string; name: string; slug: string; parentId: string | null; }

function buildTree(cats: Cat[]): Cat[] {
  const map = new Map<string, Cat & { children: Cat[] }>();
  const roots: (Cat & { children: Cat[] })[] = [];
  cats.forEach(c => map.set(c.id, { ...c, children: [] }));
  cats.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function getPath(cats: Cat[], targetId: string): Cat[] {
  const map = new Map<string, Cat>();
  cats.forEach(c => map.set(c.id, c));
  const path: Cat[] = [];
  let current = map.get(targetId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  return path;
}

function getChildrenOf(cats: Cat[], parentId: string | null): Cat[] {
  return cats.filter(c => c.parentId === parentId);
}

function hasChildren(cats: Cat[], parentId: string): boolean {
  return cats.some(c => c.parentId === parentId);
}

export default function CategoryPicker({ categories, selectedId, onChange }: { categories: { id: string; label: string; slug: string; depth: number }[]; selectedId: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewStack, setViewStack] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const cats = useMemo(() => categories.map(c => ({ id: c.id, name: c.label, slug: c.slug, parentId: null as string | null })), [categories]);

  const catMap = useMemo(() => {
    const m = new Map<string, typeof cats[0]>();
    cats.forEach(c => m.set(c.id, c));
    if (cats.length > 0) {
      const raw = categories as any[];
      for (const c of raw) {
        const same = cats.find(x => x.id === c.id);
        if (same) {
          for (let i = raw.indexOf(c) - 1; i >= 0; i--) {
            if (raw[i].depth === c.depth - 1) { same.parentId = raw[i].id; break; }
          }
        }
      }
    }
    return m;
  }, [cats, categories]);

  const selected = categories.find(c => c.id === selectedId);

  const currentParentId = viewStack.length > 0 ? viewStack[viewStack.length - 1] : null;
  const currentLevel = getChildrenOf(cats, currentParentId);
  const breadcrumb = currentParentId ? getPath(cats, currentParentId) : [];
  const topLevel = useMemo(() => getChildrenOf(cats, null), [cats]);

  const visibleCats = search.trim()
    ? cats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : currentLevel.length > 0 ? currentLevel : topLevel;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSelect = (cat: Cat) => {
    if (hasChildren(cats, cat.id)) {
      setViewStack(p => [...p, cat.id]);
    } else {
      onChange(cat.id);
      setOpen(false);
      setSearch('');
      setViewStack([]);
    }
  };

  const goBack = () => {
    setViewStack(p => p.slice(0, -1));
  };

  const resetPicker = () => {
    setOpen(false);
    setSearch('');
    setViewStack([]);
  };

  const iconFor = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return categoryIcon(slug);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: selected ? 'inherit' : 'var(--text-secondary)', textAlign: 'left' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? (() => { const path = getPath(cats, selected.id); return path.map(c => c.name).join(' > '); })() : 'Select a category...'}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.5 }} />
      </button>

      {open && (
        <div onClick={resetPicker} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, maxHeight: '80vh', background: 'var(--bg-card)', borderRadius: '1rem 1rem 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
              {viewStack.length > 0 && (
                <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', display: 'flex' }}>
                  <ArrowLeft size={20} />
                </button>
              )}
              <Search size={18} style={{ opacity: 0.4, flexShrink: 0 }} />
              <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={viewStack.length > 0 ? 'Search sub-categories...' : 'Search categories...'}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'var(--bg)', padding: '0.375rem 0.5rem', borderRadius: '0.375rem', fontSize: '1rem', color: 'inherit' }} />
              <button onClick={resetPicker} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            {/* Breadcrumb */}
            {search.trim() === '' && breadcrumb.length > 0 && (
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                {breadcrumb.map((c, i) => (
                  <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {i > 0 && <ChevronRight size={12} />}
                    <button onClick={() => { setViewStack(p => p.slice(0, i)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, fontSize: '0.75rem', textDecoration: 'underline' }}>
                      {c.name}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Category list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
              {visibleCats.length === 0 && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No categories found</p>}
              
              {search.trim() ? (
                /* Search results: show full path */
                visibleCats.map(c => {
                  const path = getPath(cats, c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => handleSelect(c)}
                      style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '0.625rem 1rem', alignItems: 'center', gap: '0.5rem', border: 'none', background: c.id === selectedId ? 'var(--primary)' : 'transparent', color: c.id === selectedId ? 'white' : 'inherit', cursor: 'pointer', fontSize: '0.8125rem', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{iconFor(c.name)}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {path.map(p => p.name).join(' > ')}
                      </span>
                      {hasChildren(cats, c.id) && <ChevronRight size={14} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.4 }} />}
                    </button>
                  );
                })
              ) : (
                /* Hierarchical drill-down */
                visibleCats.map(c => {
                  const hasChild = hasChildren(cats, c.id);
                  const isSelected = c.id === selectedId;
                  return (
                    <button key={c.id} type="button" onClick={() => handleSelect(c)}
                      style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', alignItems: 'center', gap: '0.625rem', border: 'none', background: isSelected ? 'var(--primary)' : 'transparent', color: isSelected ? 'white' : 'inherit', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{iconFor(c.name)}</span>
                      <span style={{ flex: 1 }}>{c.name}</span>
                      {hasChild && <ChevronRight size={16} style={{ flexShrink: 0, opacity: 0.4 }} />}
                      {!hasChild && <span style={{ fontSize: '0.6875rem', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)', flexShrink: 0 }}>Select</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
