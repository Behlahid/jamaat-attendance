'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load dark mode from localStorage
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('darkMode', next);
    showToast(next ? '🌙 Dark mode on' : '☀️ Light mode on', 'success');
  };

  return (
    <div className="page-container">
      <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>⚙️ Settings</h2>

      {/* Profile */}
      <div className="panel">
        <div className="panel-title">👤 Admin Profile</div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Name</div>
            <div className="text-sm text-muted">{profile?.display_name}</div>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Email</div>
            <div className="text-sm text-muted">{profile?.email}</div>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Role</div>
            <div className="text-sm text-muted">👑 Administrator</div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="panel">
        <div className="panel-title">🎨 Appearance</div>
        <div className="setting-row">
          <div className="setting-label">🌙 Dark Mode</div>
          <button
            className={`toggle ${darkMode ? 'on' : ''}`}
            onClick={toggleDarkMode}
          />
        </div>
      </div>

      {/* About */}
      <div className="panel">
        <div className="panel-title">ℹ️ About</div>
        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div className="setting-label">Jamaat Attendance System</div>
          <div className="text-xs text-muted">
            Smart attendance tracking with NFC scanning, live monitoring, and CSV export.
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-label">Version</div>
          <div className="text-sm text-muted">1.0.0</div>
        </div>
      </div>

      {/* Logout */}
      <button
        className="action-btn secondary"
        onClick={signOut}
        style={{
          width: '100%',
          marginTop: 14,
          color: 'var(--red)',
          borderColor: 'var(--red)',
        }}
      >
        🚪 Sign Out
      </button>

      {ToastComponent}
    </div>
  );
}
