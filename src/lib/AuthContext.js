'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  const fetchProfile = useCallback(async (userId, token) => {
    try {
      // Use our API route to fetch profile (avoids direct Supabase call from browser)
      const res = await fetch('/api/account/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        return data.profile;
      }
      if (res.status === 401) {
        localStorage.removeItem('jamaat_session');
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
    return null;
  }, []);

  // On mount, check for saved session in localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem('jamaat_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        setUser(parsed.user);
        fetchProfile(parsed.user.id, parsed.access_token).finally(() => setLoading(false));
      } catch {
        localStorage.removeItem('jamaat_session');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  // Sign in via server-side API route (no direct Supabase call from browser)
  const signIn = async (email, password) => {
    const res = await fetch('/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    // Save session
    const sessionData = { ...data.session, user: data.user };
    localStorage.setItem('jamaat_session', JSON.stringify(sessionData));
    setSession(sessionData);
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  // Sign up via server-side API route, then auto-login
  const signUp = async (email, password, displayName, role = 'admin') => {
    // Step 1: Create the user account
    const signupRes = await fetch('/api/account/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    
    let signupData;
    try {
      signupData = await signupRes.json();
    } catch (err) {
      throw new Error(`Signup failed to parse response (Status: ${signupRes.status})`);
    }

    if (!signupRes.ok) {
      let errStr = 'Signup failed';
      if (signupData && signupData.error) {
        errStr = typeof signupData.error === 'string' ? signupData.error : JSON.stringify(signupData.error);
      }
      throw new Error(errStr);
    }

    // Step 2: Log in to get a proper session
    const loginRes = await fetch('/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    let loginData;
    try {
      loginData = await loginRes.json();
    } catch (err) {
      throw new Error(`Login failed to parse response (Status: ${loginRes.status})`);
    }

    if (!loginRes.ok) {
      let errStr = 'Account created but login failed. Try signing in.';
      if (loginData && loginData.error) {
         errStr = typeof loginData.error === 'string' ? loginData.error : JSON.stringify(loginData.error);
      }
      throw new Error(errStr);
    }

    // Save session
    const sessionData = { ...loginData.session, user: loginData.user };
    localStorage.setItem('jamaat_session', JSON.stringify(sessionData));
    setSession(sessionData);
    setUser(loginData.user);
    setProfile(loginData.profile);
    return loginData;
  };

  const signOut = async () => {
    localStorage.removeItem('jamaat_session');
    setUser(null);
    setProfile(null);
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    }
  };

  const getAccessToken = () => {
    return session?.access_token ?? null;
  };

  // API helper with auth header
  const apiFetch = async (url, options = {}) => {
    const token = getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    return res;
  };

  const value = {
    user,
    profile,
    loading,
    session,
    isAdmin: profile?.role === 'admin',
    isScanner: profile?.role === 'scanner',
    signIn,
    signUp,
    signOut,
    getAccessToken,
    apiFetch,
    refreshProfile: () => user && fetchProfile(user.id, session?.access_token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
