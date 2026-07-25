'use client';
import { useState } from 'react';
import { Image, Folder, Upload, Trash2 } from 'lucide-react';

export default function MediaPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Media Manager</h1><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Manage your images and videos</p></div>
        <button className="btn btn-primary btn-sm"><Upload size={16} /> Upload</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ aspectRatio: '1', background: 'var(--bg)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Image size={40} style={{ opacity: 0.3 }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>image-{i}.jpg</p>
          </div>
        ))}
      </div>
    </div>
  );
}