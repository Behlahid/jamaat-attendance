'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { playSuccess, playLate, playError } from '@/lib/audio';
import {
  ScanLine,
  LogOut,
  MapPin,
  DoorOpen,
  ChevronDown,
  PlayCircle,
  AlertTriangle,
  StopCircle,
  Hourglass,
  CheckCircle2,
  Loader2,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';

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
  const [gate, setGate] = useState('');

  // Load saved gate
  useEffect(() => {
    const savedGate = localStorage.getItem('jamaat_scanner_gate');
    if (savedGate) setGate(savedGate);
  }, []);

  const handleGateChange = (e) => {
    setGate(e.target.value);
    localStorage.setItem('jamaat_scanner_gate', e.target.value);
  };

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
      showToast('No active event', 'error');
      playError();
      return;
    }
    if (!gate) {
      showToast('Please select a gate first', 'error');
      playError();
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
          gate,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const shortName = data.member.name.split(' ').slice(0, 4).join(' ');
        if (data.record.status === 'late') {
          showToast(`LATE: ${shortName}`, 'info');
          playLate();
        } else {
          showToast(shortName, 'success');
          playSuccess();
        }
        setScanCount((c) => c + 1);
        setLastScan({ name: data.member.name, its_id: data.member.its_id, time: new Date() });
        // Vibrate on success
        if (navigator.vibrate) navigator.vibrate(100);
      } else if (res.status === 409) {
        const shortName = data.member.name.split(' ').slice(0, 3).join(' ');
        showToast(`Already marked: ${shortName}`, 'error');
        playError();
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      } else {
        showToast(`${data.error}: ${id}`, 'error');
        playError();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    } catch (err) {
      showToast('Network error', 'error');
      playError();
    }
    setSubmitting(false);
    setIdentifier('');
    inputRef.current?.focus();
  };

  // NFC scanning
  const startNFC = async () => {
    if (!gate) {
      showToast('Please select a gate first', 'error');
      playError();
      return;
    }

    if (!('NDEFReader' in window)) {
      showToast('NFC needs Chrome on Android', 'error');
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
      showToast('Ready — tap an NFC card now', 'info');

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
        showToast('Unformatted or unsupported card. Cannot read.', 'error');
      });
    } catch (e) {
      setNfcScanning(false);
      setNfcAbort(null);
      if (e.name === 'NotAllowedError') {
        showToast('NFC permission denied', 'error');
      } else {
        showToast(`NFC error: ${e.message}`, 'error');
      }
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
        {/* Active Event */}
        {activeEvent ? (
          <>
            <div className="event-bar">
              <div>
                <div className="event-label">Active Event</div>
                <div className="event-name"><MapPin /> {activeEvent.name}</div>
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
              <div className="time-panel">
                <div className="time-row start">
                  <span className="time-row-icon"><PlayCircle /></span>
                  <span className="time-row-label">Starts</span>
                  <span className="time-row-value">{activeEvent.start_time ? new Date(activeEvent.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                </div>
                <div className="time-row late">
                  <span className="time-row-icon"><AlertTriangle /></span>
                  <span className="time-row-label">Late After</span>
                  <span className="time-row-value">{activeEvent.late_time ? new Date(activeEvent.late_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                </div>
                <div className="time-row end">
                  <span className="time-row-icon"><StopCircle /></span>
                  <span className="time-row-label">Ends</span>
                  <span className="time-row-value">{activeEvent.end_time ? new Date(activeEvent.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set'}</span>
                </div>
              </div>
            )}

            {/* Gate Selector */}
            <div className="panel" style={{ padding: '12px 14px', marginBottom: '14px' }}>
              <div className="field-icon-wrap">
                <span className="field-icon"><DoorOpen /></span>
                <select
                  value={gate}
                  onChange={handleGateChange}
                  className="gate-select"
                >
                  <option value="" disabled>Select your gate...</option>
                  <option value="Gents Main Gate">Gents Main Gate</option>
                  <option value="Gents Gate 2">Gents Gate 2</option>
                  <option value="Ladies Main Gate">Ladies Main Gate</option>
                  <option value="Ladies Gate 2">Ladies Gate 2</option>
                  <option value="VIP Gate">VIP Gate</option>
                  <option value="Office">Office / Late Entry</option>
                </select>
                <span className="gate-chevron"><ChevronDown /></span>
              </div>
            </div>
          </>
        ) : (
          <div className="panel empty-state">
            <div className="empty-icon"><Hourglass /></div>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>No Active Event</div>
            <div className="text-muted text-sm">
              Ask the admin to create and activate an event.
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card present">
            <span className="stat-icon"><UserCheck /></span>
            <div className="stat-num">{scanCount}</div>
            <div className="stat-label">Scanned</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon"><Users /></span>
            <div className="stat-num">{totalMembers}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card absent">
            <span className="stat-icon"><UserX /></span>
            <div className="stat-num">{totalMembers - scanCount}</div>
            <div className="stat-label">Remaining</div>
          </div>
        </div>

        {/* Scan Input */}
        {activeEvent && (
          <div className="panel">
            <div className="panel-title"><ScanLine /> Scan Attendance</div>
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
                <CheckCircle2 /> Mark
              </button>
            </div>

            {/* NFC scanning temporarily disabled — startNFC()/state kept intact to re-enable later */}
          </div>
        )}

        {/* Last Scan */}
        {lastScan && (
          <div className="panel" style={{
            background: 'var(--green-light)',
            border: '1px solid rgba(46,139,87,0.2)',
          }}>
            <div className="last-scan-label"><CheckCircle2 /> LAST SCAN</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{lastScan.name}</div>
            <div className="text-muted text-xs" style={{ marginTop: 2 }}>
              ITS: {lastScan.its_id} · {lastScan.time.toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </div>
          </div>
        )}
      </div>

      <div className="page-credit">BEHLAH</div>

      {ToastComponent}
    </div>
  );
}
