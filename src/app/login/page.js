'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const { user, profile, loading, signIn, signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(profile.role === 'admin' ? '/admin' : '/scan');
    }
  }, [user, profile, loading, router]);

  // Check if this is first-time setup (no admin exists)
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/account/check-setup');
        const data = await res.json();
        setIsSetup(!data.hasAdmin);
      } catch {
        setIsSetup(false);
      }
      setCheckingSetup(false);
    }
    checkSetup();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isSetup) {
        // First-time admin setup
        if (!displayName.trim()) {
          setError('Please enter your name');
          setSubmitting(false);
          return;
        }
        await signUp(email, password, displayName, 'admin');
        // Small delay for profile creation trigger
        setTimeout(() => {
          router.replace('/admin');
        }, 1000);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      console.error('Auth error (full object):', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      let msg = 'Something went wrong. Please try again.';
      if (typeof err === 'string') msg = err;
      else if (err?.message && err.message !== '{}') msg = err.message;
      else if (err?.error_description) msg = err.error_description;
      else if (err?.msg) msg = err.msg;
      else if (err?.error) msg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
      else msg = JSON.stringify(err);
      setError(msg);
    }
    setSubmitting(false);
  };

  if (loading || checkingSetup) {
    return (
      <div className="lock-screen">
        <div className="lock-icon">🕌</div>
        <div className="lock-title">Jamaat Attendance</div>
        <div className="lock-sub">Loading…</div>
      </div>
    );
  }

  return (
    <div className="lock-screen">
      <div className="lock-icon">{isSetup ? '🛠️' : '🕌'}</div>
      <div className="lock-title">
        {isSetup ? 'Admin Setup' : 'Jamaat Attendance'}
      </div>
      <div className="lock-sub">
        {isSetup
          ? 'Create your admin account to get started'
          : 'Sign in to continue'}
      </div>

      <form onSubmit={handleSubmit} style={{ 
        width: '100%', 
        maxWidth: 320, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 10,
        position: 'relative',
        zIndex: 1,
        padding: '0 20px',
      }}>
        {isSetup && (
          <input
            type="text"
            placeholder="Your Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            autoComplete="name"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
          autoComplete={isSetup ? 'new-password' : 'current-password'}
        />

        {error && (
          <div className="pin-error">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '14px',
            borderRadius: 14,
            border: 'none',
            background: 'white',
            color: '#1a6b3c',
            fontSize: 15,
            fontWeight: 800,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          {submitting
            ? '...'
            : isSetup
            ? '🛠️ Create Admin Account'
            : '🔓 Sign In'}
        </button>
      </form>

      {isSetup && (
        <div className="pin-hint">
          This is a one-time setup. You&apos;ll create scanner accounts later.
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '20px' }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: '2px' }}>
          Engineered By
        </div>
        <div style={{ fontSize: '15px', fontWeight: 900, background: 'linear-gradient(135deg, #00C9FF, #92FE9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.5px' }}>
          BEHLAH
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '13px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.1)',
  backdropFilter: 'blur(10px)',
  color: 'white',
  fontSize: 15,
  fontWeight: 500,
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
};
