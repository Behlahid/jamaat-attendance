'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  WifiOff,
  Search,
  LogOut,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Hourglass, PlayCircle } from 'lucide-react';

import { useScanEvent } from '@/hooks/useScanEvent';
import { extractTextFromNfcMessage } from '@/lib/nfcUtils';

const Skeleton = dynamic(() => import('@/components/Skeleton').then(mod => mod.Skeleton), { ssr: false, loading: () => <div>Loading...</div> });
const SkeletonStats = dynamic(() => import('@/components/Skeleton').then(mod => mod.SkeletonStats), { ssr: false, loading: () => <div>Loading...</div> });
const EventHeader = dynamic(() => import('@/components/scan/ScannerComponents').then(mod => mod.EventHeader), { ssr: false, loading: () => <div>Loading...</div> });
const GateSelector = dynamic(() => import('@/components/scan/ScannerComponents').then(mod => mod.GateSelector), { ssr: false, loading: () => <div>Loading...</div> });
const ScannerStats = dynamic(() => import('@/components/scan/ScannerComponents').then(mod => mod.ScannerStats), { ssr: false, loading: () => <div>Loading...</div> });
const useToast = dynamic(() => import('@/components/Toast').then(mod => mod.useToast), { ssr: false, loading: () => ({ showToast: () => {}, ToastComponent: null }) });

export default function ScanPage() {
  const { user, profile, loading, signOut, apiFetch } = useAuth();
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  
  const [gate, setGate] = useState('');
  const [identifier, setIdentifier] = useState('');
  const inputRef = useRef(null);

  const {
    activeEvent, scanCount, totalMembers, lastScan,
    loadingEvent, submitting, eventNotStarted,
    loadActiveEvent, markAttendance
  } = useScanEvent(apiFetch, showToast);

  // Initialize gate from local storage
  useEffect(() => {
    const savedGate = localStorage.getItem('jamaat_scanner_gate');
    if (savedGate) setGate(savedGate);
  }, []);

  // Auth Guard
  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace('/login');
    if (!profile) return router.replace('/');
    if (profile.role === 'admin') return router.replace('/admin');
    
    loadActiveEvent();
  }, [user, profile, loading, router, loadActiveEvent]);

  // Keep track of IDs currently in-flight to prevent double-submitting the same ID if they mash Enter
  const pendingScansRef = useRef(new Set());

  const handleGateChange = (e) => {
    setGate(e.target.value);
    localStorage.setItem('jamaat_scanner_gate', e.target.value);
  };

  const handleManualScan = async (overrideId) => {
    const idToScan = (typeof overrideId === 'string' ? overrideId : identifier).trim();
    if (!idToScan || pendingScansRef.current.has(idToScan)) return;
    
    // OPTIMISTIC UI: Instantly clear the box so they can type the next person's ID immediately!
    setIdentifier('');
    inputRef.current?.focus();
    
    pendingScansRef.current.add(idToScan);
    
    await markAttendance(idToScan, gate, 'manual');
    
    pendingScansRef.current.delete(idToScan);
  };

  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    setIdentifier(val);
    
    if (/^\d{8}$/.test(val.trim())) {
      handleManualScan(val.trim());
    }
  };

  if (loading) {
    return (
      <div className="auth-loading" role="status" aria-label="Loading">
        <div className="auth-orb one" />
        <div className="auth-orb two" />
        <div className="auth-loading-card">
          <img src="/icon.png" alt="Logo" style={{ width: 32, height: 32 }} />
          <div className="auth-loading-title">Loading…</div>
          <Loader2 className="spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="scanner-wrap" id="main-content">
      <div className="auth-orb one" />
      <div className="auth-orb two" />
      
      {/* Header */}
      <header className="app-header">
        <div className="hdr-icon"><ScanLine /></div>
        <div className="hdr-info">
          <h1>Scanner</h1>
          <p>{profile?.display_name}</p>
        </div>
        <div className="hdr-right">
          <button className="lock-btn" onClick={signOut} aria-label="Log out of your account">
            <LogOut /> Logout
          </button>
        </div>
      </header>

      <main className="page-container" role="main">
        {loadingEvent ? (
          <>
            <div className="skeleton-row" style={{ marginBottom: 14 }}>
              <div className="skeleton-row-text">
                <Skeleton width={90} height={9} />
                <Skeleton width="60%" height={14} />
              </div>
              <Skeleton width={70} height={12} />
            </div>
            <SkeletonStats />
            <div className="panel">
              <Skeleton width={140} height={12} style={{ marginBottom: 14 }} />
              <Skeleton height={44} style={{ marginBottom: 10 }} />
              <Skeleton height={48} />
            </div>
          </>
        ) : (
          <>
            {activeEvent ? (
              <>
                <EventHeader event={activeEvent} />
                <GateSelector gate={gate} onChange={handleGateChange} />
              </>
            ) : (
              <div className="panel empty-state">
                <div className="empty-icon"><Hourglass /></div>
                <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>No Active Event</div>
                <div className="text-muted text-sm">Ask the admin to create and activate an event.</div>
              </div>
            )}

            <ScannerStats present={scanCount} total={totalMembers} />

            {/* Scan Input Block */}
            {activeEvent && (
              <div className="panel">
                <div className="panel-title"><ScanLine /> Scan Attendance</div>
                {eventNotStarted ? (
                  <div className="empty-state" style={{ padding: '20px 10px' }}>
                    <div className="empty-icon"><PlayCircle /></div>
                    <div style={{ color: 'var(--text)', fontWeight: 700 }}>Scanning opens at start time</div>
                  </div>
                ) : (
                  <div className="input-row">
                    <label htmlFor="its-id-input" className="sr-only">Enter ITS ID</label>
                    <input
                      id="its-id-input"
                      ref={inputRef}
                      className="id-input"
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      placeholder="Enter ITS ID…"
                      aria-label="Enter ITS ID for attendance"
                      value={identifier}
                      onChange={handleIdentifierChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleManualScan();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      className="mark-btn"
                      onClick={() => handleManualScan()}
                      disabled={!identifier.trim()}
                      aria-label="Mark attendance"
                    >
                      <CheckCircle2 /> Mark
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Last Scan Banner */}
        {lastScan && (
          <div className="panel" style={{ background: 'rgba(200, 164, 74, 0.25)', border: '1px solid rgba(200, 164, 74, 0.5)' }}>
            <div className="last-scan-label" style={{ color: '#e5c158' }}><CheckCircle2 /> LAST SCAN</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{lastScan.name}</div>
            <div className="text-muted text-xs" style={{ marginTop: 2, color: 'rgba(255,255,255,0.7)' }}>
              ITS: {lastScan.its_id} · {lastScan.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        )}
      </main>
      <div className="auth-credit" style={{ paddingBottom: '30px' }}>
        RAJINFOSYS PRODUCTIONS | © 2026 JAMAAT ATTENDANCE APP | v1.0
      </div>
      {ToastComponent}
    </div>
  );
}
