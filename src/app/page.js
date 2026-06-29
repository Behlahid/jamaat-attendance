'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
    } else if (profile?.role === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/scan');
    }
  }, [user, profile, loading, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'lockBounce 2s ease infinite' }}>🕌</div>
        <div style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>Loading…</div>
      </div>
    </div>
  );
}
