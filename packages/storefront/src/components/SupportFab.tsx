'use client';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function SupportFab() {
  const pathname = usePathname();
  if (pathname === '/support') return null;
  return (
    <Link
      href="/support"
      aria-label="Chat with Lyn-nyx: suggestions, bug reports and questions"
      title="Feedback, ideas & bug reports"
      style={{
        position: 'fixed',
        right: '1.25rem',
        bottom: '1.25rem',
        zIndex: 40,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'var(--primary, #111)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        textDecoration: 'none',
      }}
    >
      <MessageSquare size={24} />
    </Link>
  );
}