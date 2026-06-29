'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12, animation: 'lockBounce 2s ease infinite' }}>🕌</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header className="app-header">
        <div className="hdr-icon">👑</div>
        <div className="hdr-info">
          <h1>Jamaat Attendance</h1>
          <p>Admin · {profile.display_name}</p>
        </div>
        <div className="hdr-right">
          <div className="date-badge">
            {new Date().toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </div>
          <button className="lock-btn" onClick={signOut}>
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      {children}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavItem href="/admin" icon="📊" label="Dashboard" />
        <NavItem href="/admin/events" icon="📅" label="Events" />
        <NavItem href="/admin/members" icon="👥" label="Members" />
        <NavItem href="/admin/scanners" icon="📱" label="Scanners" />
        <NavItem href="/admin/settings" icon="⚙️" label="Settings" />
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
      onClick={() => router.push(href)}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
