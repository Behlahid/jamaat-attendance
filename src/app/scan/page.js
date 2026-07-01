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
  AlertCircle,
  Calendar
} from 'lucide-react';
import { Hourglass, PlayCircle } from 'lucide-react';

import { useScanEvent } from '@/hooks/useScanEvent';
import { extractTextFromNfcMessage } from '@/lib/nfcUtils';

const Skeleton = dynamic(() => import('@/components/Skeleton').then(mod => mod.Skeleton), { ssr: false, loading: () => <div>Loading...</div> });
const SkeletonStats = dynamic(() => import('@/components/Skeleton').then(mod => mod.SkeletonStats), { ssr: false, loading: () => <div>Loading...</div> });
const EventHeader = dynamic(() => import('@/components/scan/ScannerComponents').then(mod => mod.EventHeader), { ssr: false, loading: () => <div>Loading...</div> });
const GateSelector = dynamic(() => import('@/components/scan/ScannerComponents').then(mod => mod.GateSelector), { ssr: false, loading: () => <div>Loading...</div> });
const ScannerStats = dynamic(() => import('@/components/scan/ScannerComponents').then(mod => mod.ScannerStats), { ssr: false, loading: () => <div>Loading...</div> });
import { useToast } from '@/components/Toast';

export default function ScanPage() {
  const { user, profile, loading, signOut, apiFetch } = useAuth();
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  
  const [gate, setGate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jamaat_scanner_gate') || '';
    }
    return '';
  });
  const [identifier, setIdentifier] = useState('');
  const inputRef = useRef(null);

  const {
    activeEvent, availableEvents, switchEvent, scanCount, totalMembers, lastScan,
    loadingEvent, submitting, eventNotStarted,
    loadActiveEvent, markAttendance
  } = useScanEvent(apiFetch, showToast);

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
              <div className="compact-event-header">
                <div className="ceh-main" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Skeleton width={16} height={16} />
                  <Skeleton width={120} height={16} />
                </div>
                <div className="ceh-date">
                  <Skeleton width={60} height={14} />
                </div>
              </div>
              <div className="compact-gate-selector">
                <Skeleton width={16} height={16} className="cgs-icon" />
                <Skeleton width={100} height={16} style={{ marginLeft: 10, flex: 1 }} />
                <Skeleton width={16} height={16} className="cgs-chevron" />
              </div>
            </div>

            <div className="panel" style={{ border: '1px solid var(--tint)', boxShadow: '0 0 20px rgba(0, 122, 255, 0.15)' }}>
              <div className="panel-title" style={{ color: 'var(--tint)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Skeleton width={20} height={20} />
                <Skeleton width={120} height={18} />
              </div>
              <div className="input-row">
                <Skeleton height={50} style={{ flex: 1, borderRadius: 'var(--radius-sm)' }} />
                <Skeleton width={90} height={50} style={{ borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>

            <div className="compact-stats">
              <div className="cs-labels">
                <Skeleton width={80} height={14} />
                <Skeleton width={90} height={14} />
              </div>
              <div className="cs-bar-wrap">
                <Skeleton width="100%" height="100%" />
              </div>
            </div>
          </>
        ) : (
          <>
            {activeEvent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginBottom: '14px' }}>
                {availableEvents && availableEvents.length > 1 && (
                  <div className="compact-gate-selector" style={{ marginBottom: '-10px', zIndex: 5 }}>
                    <Calendar size={16} className="cgs-icon" />
                    <select 
                      value={activeEvent.id} 
                      onChange={(e) => switchEvent(e.target.value)} 
                      className="cgs-select" 
                      aria-label="Select event"
                    >
                      {availableEvents.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="cgs-chevron" />
                  </div>
                )}
                <EventHeader event={activeEvent} />
                <GateSelector gate={gate} onChange={handleGateChange} />
              </div>
            ) : (
              <div className="panel empty-state">
                <div className="empty-icon"><Hourglass /></div>
                <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>No Active Event</div>
                <div className="text-muted text-sm">Ask the admin to create and activate an event.</div>
              </div>
            )}

            {/* Scan Input Block (Primary Focus) */}
            {activeEvent && (
              <div className="panel" style={{ border: '1px solid var(--tint)', boxShadow: '0 0 20px rgba(0, 122, 255, 0.15)' }}>
                <div className="panel-title" style={{ color: 'var(--tint)' }}><ScanLine /> Scan Attendance</div>
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

            {/* Immediate Feedback (Last Scan Banner) */}
            {lastScan && (
              <div key={lastScan.time.getTime()} className="panel flash-success" style={{ border: '1px solid rgba(48, 209, 88, 0.4)' }}>
                <div className="last-scan-label" style={{ color: 'var(--green)' }}><CheckCircle2 /> SUCCESS</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{lastScan.name}</div>
                <div className="text-muted text-sm" style={{ marginTop: 2, color: 'rgba(255,255,255,0.7)' }}>
                  ITS: {lastScan.its_id} · {lastScan.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            )}

            {/* Compact Stats at the bottom */}
            {activeEvent && (
              <ScannerStats present={scanCount} total={totalMembers} />
            )}
          </>
        )}
      </main>
      <div className="auth-credit" style={{ position: 'fixed', bottom: '15px', width: '100%', textAlign: 'center', zIndex: 10 }}>
        RAJINFOSYS PRODUCTIONS | © 2026 JAMAAT ATTENDANCE APP | v1.0
      </div>
      {ToastComponent}
    </div>
  );
}
