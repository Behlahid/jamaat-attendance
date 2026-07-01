'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  Crown,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Users,
  Smartphone,
  Settings,
  Loader2,
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!profile) {
      router.replace('/');
      return;
    }

    if (!isAdmin) {
      router.replace('/scan');
    }
  }, [user, profile, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 />
        <div className="admin-loading-title">Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header className="app-header">
        <div className="hdr-icon"><Crown /></div>
        <div className="hdr-info">
          <h1>Jamaat Attendance</h1>
          <p>Admin · {profile?.display_name}</p>
        </div>
        <div className="hdr-right">
          <div className="date-badge">
            {new Date().toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </div>
          <button className="lock-btn" onClick={signOut}>
            <LogOut /> Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <div style={{ paddingBottom: '80px' }}>
        {children}

        <div className="page-credit">BEHLAH</div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavItem href="/admin" icon={<LayoutDashboard />} label="Dashboard" />
        <NavItem href="/admin/events" icon={<CalendarDays />} label="Events" />
        <NavItem href="/admin/members" icon={<Users />} label="Members" />
        <NavItem href="/admin/scanners" icon={<Smartphone />} label="Scanners" />
        <NavItem href="/admin/settings" icon={<Settings />} label="Settings" />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label }) {
  const router = useRouter();
  let pathname = '';
  if (typeof window !== 'undefined') {
    pathname = window.location.pathname;
  }
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
  const isExactDashboard = href === '/admin' && pathname === '/admin';

  return (
    <button
      className={`nav-item ${isActive || isExactDashboard ? 'active' : ''}`}
      onClick={() => router.replace(href)}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
