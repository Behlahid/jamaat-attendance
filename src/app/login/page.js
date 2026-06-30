'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  Landmark,
  Wrench,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  LogIn,
  UserPlus,
  Loader2,
} from 'lucide-react';

export default function LoginPage() {
  const { user, profile, loading, signIn, signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="auth-loading">
        <Loader2 />
        <div className="auth-loading-title">Jamaat Attendance</div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-orb one" />
      <div className="auth-orb two" />
      <div className="auth-wrap">
        <div className="auth-badge">
          {isSetup ? <Wrench /> : <Landmark />}
        </div>
        <div className="auth-heading">
          {isSetup ? 'Admin Setup' : 'Jamaat Attendance'}
        </div>
        <div className="auth-subheading">
          {isSetup
            ? 'Create your admin account to get started'
            : 'Sign in to continue'}
        </div>

        <form onSubmit={handleSubmit} className="auth-card" noValidate>
          {isSetup && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="displayName">Your Name</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><User /></span>
                <input
                  id="displayName"
                  type="text"
                  placeholder="e.g. Hatim Soni"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="auth-input"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><Mail /></span>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                autoComplete="email"
                inputMode="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><Lock /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input has-toggle"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={submitting} className="auth-submit">
            {submitting ? (
              <>
                <Loader2 className="spin" />
                {isSetup ? 'Creating account…' : 'Signing in…'}
              </>
            ) : isSetup ? (
              <>
                <UserPlus />
                Create Admin Account
              </>
            ) : (
              <>
                <LogIn />
                Sign In
              </>
            )}
          </button>

          {isSetup && (
            <div className="auth-hint">
              <Info />
              <span>This is a one-time setup. You&apos;ll create scanner accounts later.</span>
            </div>
          )}
        </form>

        <div className="auth-credit">BEHLAH</div>
      </div>
    </div>
  );
}
