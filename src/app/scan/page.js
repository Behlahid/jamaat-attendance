'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { Skeleton, SkeletonStats } from '@/components/Skeleton';
import { ScanLine, LogOut, Hourglass, CheckCircle2, Loader2, PlayCircle } from 'lucide-react';

import { useScanEvent } from '@/hooks/useScanEvent';
import { extractTextFromNfcMessage } from '@/lib/nfcUtils';
import { EventHeader, GateSelector, ScannerStats } from '@/components/scan/ScannerComponents';

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
      <div className="auth-loading">
        <Loader2 />
        <div className="auth-loading-title">Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header className="app-header">
        <div className="hdr-icon"><ScanLine /></div>
        <div className="hdr-info">
          <h1>Scanner</h1>
          <p>{profile?.display_name}</p>
        </div>
        <div className="hdr-right">
          <button className="lock-btn" onClick={signOut}>
            <LogOut /> Logout
          </button>
        </div>
      </header>

      <div className="page-container">
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
                    <input
                      ref={inputRef}
                      className="id-input"
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      placeholder="Enter ITS ID…"
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
          <div className="panel" style={{ background: 'var(--green-light)', border: '1px solid rgba(46,139,87,0.2)' }}>
            <div className="last-scan-label"><CheckCircle2 /> LAST SCAN</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{lastScan.name}</div>
            <div className="text-muted text-xs" style={{ marginTop: 2 }}>
              ITS: {lastScan.its_id} · {lastScan.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        )}
      </div>
      <div className="page-credit">BEHLAH</div>
      {ToastComponent}
    </div>
  );
}
