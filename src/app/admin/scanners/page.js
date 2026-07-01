'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import dynamic from 'next/dynamic';
const useToast = dynamic(() => import('@/components/Toast').then(mod => mod.useToast), { ssr: false, loading: () => ({ showToast: () => {}, ToastComponent: null }) });
const SkeletonRow = dynamic(() => import('@/components/Skeleton').then(mod => mod.SkeletonRow), { ssr: false, loading: () => <div>Loading...</div> });
import {
  Smartphone,
  Plus,
  Check,
  Loader2,
  Trash2,
  Info,
  Calendar,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function ScannersPage() {
  const { apiFetch } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const [scanners, setScanners] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  // Event assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [assignedEventIds, setAssignedEventIds] = useState([]);

  const loadScanners = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch('/api/account/register-scanner');
      const data = await res.json();
      setScanners(data.scanners || []);
    } catch (err) {
      console.error('Load scanners error:', err);
    }
    setLoadingList(false);
  }, [apiFetch]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await apiFetch('/api/events');
      const data = await res.json();
      setAllEvents(data.events || []);
    } catch (err) {
      console.error('Load events error:', err);
    }
  }, [apiFetch]);

  // eslint-disable-next-line
  useEffect(() => { loadScanners(); loadEvents(); }, [loadScanners, loadEvents]);

  const openAssignModal = async (scanner) => {
    setSelectedScanner(scanner);
    setShowAssignModal(true);
    try {
      const res = await apiFetch(`/api/scanners/${scanner.id}/events`);
      const data = await res.json();
      setAssignedEventIds(data.eventIds || []);
    } catch (err) {
      showToast('Failed to load assignments', 'error');
    }
  };

  const toggleEvent = (eventId) => {
    setAssignedEventIds(prev => 
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const saveAssignments = async () => {
    try {
      const res = await apiFetch(`/api/scanners/${selectedScanner.id}/events`, {
        method: 'POST',
        body: JSON.stringify({ eventIds: assignedEventIds })
      });
      if (res.ok) {
        showToast('Assignments saved!', 'success');
        setShowAssignModal(false);
      } else {
        showToast('Failed to save', 'error');
      }
    } catch (err) {
      showToast('Error saving', 'error');
    }
  };

  const createScanner = async () => {
    if (!email || !password || !displayName) {
      showToast('All fields are required', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('/api/account/register-scanner', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Scanner "${displayName}" created!`, 'success');
        setShowCreate(false);
        setEmail('');
        setPassword('');
        setDisplayName('');
        loadScanners();
      } else {
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Failed to create scanner', 'error');
    }
    setCreating(false);
  };

  const deleteScanner = async (scanner) => {
    if (!confirm(`Delete scanner "${scanner.display_name}" (${scanner.email})? They will no longer be able to log in.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/account/register-scanner?id=${scanner.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Scanner deleted', 'success');
        loadScanners();
      } else {
        const data = await res.json();
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title"><Smartphone /> Scanners</div>
        <button className="new-event-btn" onClick={() => setShowCreate(true)}>
          <Plus /> Add Scanner
        </button>
      </div>

      <p className="text-sm text-muted mb-3">
        Scanners can only mark attendance at active events. They cannot import/export CSV, manage events, or access settings.
      </p>

      {/* Create Scanner Form */}
      {showCreate && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-title">Create Scanner Account</div>
          <input
            className="id-input"
            placeholder="Display name (e.g., Scanner 1)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ marginBottom: 10, width: '100%' }}
            autoFocus
          />
          <input
            className="id-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: 10, width: '100%' }}
          />
          <input
            className="id-input"
            type="text"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginBottom: 10, width: '100%' }}
          />
          <div className="action-row">
            <button className="action-btn secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="action-btn primary" onClick={createScanner} disabled={creating}>
              {creating ? <Loader2 className="btn-spinner" /> : <Check />} Create Scanner
            </button>
          </div>
        </div>
      )}

      {/* Scanner List */}
      {loadingList ? (
        <div className="member-list">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : scanners.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <div className="empty-icon"><Smartphone /></div>
            <div>No scanners yet</div>
            <div className="text-xs text-muted mt-2">
              Create scanner accounts for your helpers
            </div>
          </div>
        </div>
      ) : (
        <div className="member-list">
          {scanners.map((s) => (
            <div key={s.id} className="session-card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Smartphone size={15} /> {s.display_name}
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                    {s.email}
                  </div>
                  <div className="text-xs text-muted">
                    Created: {new Date(s.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      className="session-btn"
                      onClick={() => openAssignModal(s)}
                    >
                      <Calendar /> Assign Events
                    </button>
                    <button
                      className="session-btn danger"
                      onClick={() => deleteScanner(s)}
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Credentials Info */}
      {scanners.length > 0 && (
        <div className="panel" style={{ marginTop: 14, background: 'var(--blue-light)', border: '1px solid rgba(26,95,168,0.2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} /> How to use
          </div>
          <div className="text-sm text-muted">
            Share the email and password with your scanner helpers. They go to the same URL, log in, and they&apos;ll only see the scanning interface.
          </div>
        </div>
      )}

      {/* Assign Events Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Events to ${selectedScanner?.display_name}`}>
        <p className="text-sm text-muted mb-3">Select which events this scanner is allowed to mark attendance for.</p>
        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
          {allEvents.length === 0 && <div className="text-sm text-muted">No events exist.</div>}
          {allEvents.map(e => (
            <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={assignedEventIds.includes(e.id)}
                onChange={() => toggleEvent(e.id)}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={15} /> {e.name}
              </span>
            </label>
          ))}
        </div>
        <button className="action-btn primary" onClick={saveAssignments} style={{ width: '100%' }}>
          <Check /> Save Assignments
        </button>
      </Modal>

      {ToastComponent}
    </div>
  );
}
