'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, MoonStar } from 'lucide-react';

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
    <div className="auth-loading">
      <div className="auth-orb one" />
      <div className="auth-orb two" />
      <div className="auth-loading-card">
        <MoonStar />
        <div className="auth-loading-title">Jamaat Attendance</div>
        <Loader2 className="spin" />
      </div>
    </div>
  );
}
