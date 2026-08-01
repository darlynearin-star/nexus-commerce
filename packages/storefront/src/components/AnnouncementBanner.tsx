'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    apiClient<{ success: boolean; data: Announcement[] }>('/announcements')
      .then(r => setAnnouncements(r.data || []))
      .catch(() => {});
  }, []);

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ position: 'relative', zIndex: 50 }}>
      {visible.map(a => (
        <div
          key={a.id}
          style={{
            background: a.type === 'ERROR' || a.type === 'CRITICAL' ? '#7f1d1d' : a.type === 'WARNING' ? '#7c2d12' : '#14532d',
            color: '#fff',
            padding: '0.5rem 3rem 0.5rem 1.25rem',
            fontSize: '0.875rem',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <strong style={{ marginRight: '0.5rem' }}>{a.title}</strong>
          {a.message}
          <button
            aria-label="Dismiss announcement"
            onClick={() => setDismissed(prev => [...prev, a.id])}
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
