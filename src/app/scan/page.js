'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';

export default function ScanPage() {
  const { user, profile, loading, signOut, apiFetch } = useAuth();
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const inputRef = useRef(null);

  const [activeEvent, setActiveEvent] = useState(null);
  const [identifier, setIdentifier] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [lastScan, setLastScan] = useState(null);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcAbort, setNfcAbort] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Auth guard
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

    if (profile.role === 'admin') {
      router.replace('/admin');
    }
  }, [user, profile, loading, router]);

  // Load active event
  const loadActiveEvent = useCallback(async () => {
    try {
      const res = await apiFetch('/api/events?active=true');
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        const event = data.events[0];
        setActiveEvent(event);
        // Load attendance count
        const attRes = await apiFetch(`/api/attendance?eventId=${event.id}`);
        const attData = await attRes.json();
        setScanCount(attData.present || 0);
        setTotalMembers(attData.total || 0);
      }
    } catch (err) {
      console.error('Failed to load event:', err);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user && profile) {
      loadActiveEvent();
    }
  }, [user, profile, loadActiveEvent]);

  // Mark attendance
  const markAttendance = async (id, method = 'manual') => {
    if (!activeEvent) {
      showToast('❌ No active event', 'error');
      return;
    }
    if (!id.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          eventId: activeEvent.id,
          identifier: id.trim(),
          method,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const shortName = data.member.name.split(' ').slice(0, 4).join(' ');
        if (data.record.status === 'late') {
          showToast(`⚠️ LATE: ${shortName}`, 'info');
        } else {
          showToast(`✅ ${shortName}`, 'success');
        }
        setScanCount((c) => c + 1);
        setLastScan({ name: data.member.name, its_id: data.member.its_id, time: new Date() });
        // Vibrate on success
        if (navigator.vibrate) navigator.vibrate(100);
      } else if (res.status === 409) {
        const shortName = data.member.name.split(' ').slice(0, 3).join(' ');
        showToast(`⚠️ Already marked: ${shortName}`, 'error');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      } else {
        showToast(`❌ ${data.error}: ${id}`, 'error');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    } catch (err) {
      showToast('❌ Network error', 'error');
    }
    setSubmitting(false);
    setIdentifier('');
    inputRef.current?.focus();
  };

  // NFC scanning
  const startNFC = async () => {
    if (!('NDEFReader' in window)) {
      showToast('📱 NFC needs Chrome on Android', 'error');
      return;
    }

    if (nfcScanning) {
      if (nfcAbort) nfcAbort.abort();
      setNfcScanning(false);
      setNfcAbort(null);
      return;
    }

    try {
      const ndef = new NDEFReader();
      const abort = new AbortController();
      await ndef.scan({ signal: abort.signal });
      setNfcScanning(true);
      setNfcAbort(abort);
      showToast('📡 Ready — tap an NFC card now', 'info');

      ndef.addEventListener('reading', ({ message, serialNumber }) => {
        let marked = false;
        if (message && message.records) {
          for (const rec of message.records) {
            try {
              if (rec.recordType === 'text') {
                const view = new DataView(rec.data.buffer, rec.data.byteOffset, rec.data.byteLength);
                const status = view.getUint8(0);
                const langLen = status & 0x3F;
                const textBytes = new Uint8Array(rec.data.buffer, rec.data.byteOffset + 1 + langLen, rec.data.byteLength - 1 - langLen);
                let text = new TextDecoder('utf-8').decode(textBytes).trim();
                text = text.replace(/^["']+|["']+$/g, '');
                if (text) {
                  markAttendance(text, 'nfc');
                  marked = true;
                  break;
                }
              } else {
                let text = new TextDecoder('utf-8').decode(rec.data).trim();
                text = text.replace(/^["']+|["']+$/g, '');
                if (text && text.length > 2) {
                  markAttendance(text, 'nfc');
                  marked = true;
                  break;
                }
              }
            } catch {}
          }
        }
        if (!marked && serialNumber) {
          markAttendance(serialNumber.replace(/:/g, '').toUpperCase(), 'nfc');
        }
      });

      ndef.addEventListener('readingerror', () => {
        showToast('❌ Unformatted or unsupported card. Cannot read.', 'error');
      });
    } catch (e) {
      setNfcScanning(false);
      setNfcAbort(null);
      if (e.name === 'NotAllowedError') {
        showToast('❌ NFC permission denied', 'error');
      } else {
        showToast(`❌ NFC error: ${e.message}`, 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="lock-screen">
        <div className="lock-icon">🕌</div>
        <div className="lock-title">Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header className="app-header">
        <div className="hdr-icon">📱</div>
        <div className="hdr-info">
          <h1>Scanner</h1>
          <p>{profile?.display_name}</p>
        </div>
        <div className="hdr-right">
          <button className="lock-btn" onClick={signOut}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="page-container">
        {/* Active Event */}
        {activeEvent ? (
          <>
            <div className="event-bar">
              <div>
                <div className="event-label">Active Event</div>
                <div className="event-name">📌 {activeEvent.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="event-label">
                  {new Date(activeEvent.event_date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
              </div>
            </div>
            
            {(activeEvent.start_time || activeEvent.end_time || activeEvent.late_time) && (
              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '12px', fontWeight: '600', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)' }}>
                  <span>🟢 Starts:</span>
                  <span>{activeEvent.start_time ? new Date(activeEvent.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--orange)' }}>
                  <span>⚠️ Late After:</span>
                  <span>{activeEvent.late_time ? new Date(activeEvent.late_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--red)' }}>
                  <span>🛑 Ends:</span>
                  <span>{activeEvent.end_time ? new Date(activeEvent.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="panel" style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>No Active Event</div>
            <div className="text-muted text-sm">
              Ask the admin to create and activate an event.
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card present">
            <div className="stat-num">{scanCount}</div>
            <div className="stat-label">Scanned</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{totalMembers}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card absent">
            <div className="stat-num">{totalMembers - scanCount}</div>
            <div className="stat-label">Remaining</div>
          </div>
        </div>

        {/* Scan Input */}
        {activeEvent && (
          <div className="panel">
            <div className="panel-title">📲 Scan Attendance</div>
            <div className="input-row">
              <input
                ref={inputRef}
                className="id-input"
                type="text"
                inputMode="numeric"
                placeholder="Enter ITS ID…"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') markAttendance(identifier, 'manual');
                }}
                disabled={submitting}
                autoFocus
              />
              <button
                className="mark-btn"
                onClick={() => markAttendance(identifier, 'manual')}
                disabled={submitting || !identifier.trim()}
              >
                ✓ Mark
              </button>
            </div>

            <button
              className={`nfc-btn ${nfcScanning ? 'scanning' : ''}`}
              onClick={startNFC}
            >
              <span>📡</span>
              <span>
                {nfcScanning ? 'Scanning… tap again to stop' : 'Scan NFC Card'}
              </span>
            </button>
          </div>
        )}

        {/* Last Scan */}
        {lastScan && (
          <div className="panel" style={{
            background: 'var(--green-light)',
            border: '1px solid rgba(46,139,87,0.2)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>
              LAST SCAN
            </div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{lastScan.name}</div>
            <div className="text-muted text-xs" style={{ marginTop: 2 }}>
              ITS: {lastScan.its_id} · {lastScan.time.toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </div>
          </div>
        )}
      </div>

      {ToastComponent}
    </div>
  );
}
