'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';

export default function EventsPage() {
  const { apiFetch } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('19:00');
  const [lateTime, setLateTime] = useState('19:45');
  const [endTime, setEndTime] = useState('23:00');
  const [creating, setCreating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [allScanners, setAllScanners] = useState([]);
  const [assignedScannerIds, setAssignedScannerIds] = useState([]);
  
  const [isRestricted, setIsRestricted] = useState(false);
  const [inviteText, setInviteText] = useState('');
  const [inviteCount, setInviteCount] = useState(0);

  // Scanners Logic
  const openScannerModal = async (event) => {
    setSelectedEvent(event);
    setShowScannerModal(true);
    
    // Fetch all scanners
    const res1 = await apiFetch('/api/account/register-scanner');
    const data1 = await res1.json();
    setAllScanners(data1.scanners || []);

    // Fetch assigned scanners
    const res2 = await apiFetch(`/api/events/${event.id}/scanners`);
    const data2 = await res2.json();
    setAssignedScannerIds(data2.scannerIds || []);
  };

  const saveScanners = async () => {
    try {
      await apiFetch(`/api/events/${selectedEvent.id}/scanners`, {
        method: 'POST',
        body: JSON.stringify({ scannerIds: assignedScannerIds })
      });
      showToast('✅ Scanners updated', 'success');
      setShowScannerModal(false);
    } catch {
      showToast('❌ Failed to update scanners', 'error');
    }
  };

  const toggleScanner = (id) => {
    setAssignedScannerIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Invites Logic
  const openInviteModal = async (event) => {
    setSelectedEvent(event);
    setShowInviteModal(true);
    setInviteText('');
    
    const res = await apiFetch(`/api/events/${event.id}/invites`);
    const data = await res.json();
    setIsRestricted(!!data.is_restricted);
    setInviteCount(data.count || 0);
  };

  const saveRestrictedStatus = async (status) => {
    setIsRestricted(status);
    await apiFetch(`/api/events/${selectedEvent.id}/invites`, {
      method: 'POST',
      body: JSON.stringify({ is_restricted: status })
    });
  };

  const saveInvites = async () => {
    const ids = inviteText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      const res = await apiFetch(`/api/events/${selectedEvent.id}/invites`, {
        method: 'POST',
        body: JSON.stringify({ its_ids: ids })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Matched ${data.matched} members`, 'success');
        setInviteText('');
        openInviteModal(selectedEvent); // refresh count
      } else {
        showToast(`❌ ${data.error}`, 'error');
      }
    } catch {
      showToast('❌ Failed to update invites', 'error');
    }
  };

  const loadEvents = useCallback(async () => {
    const res = await apiFetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
  }, [apiFetch]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const createEvent = async () => {
    if (!newName.trim()) {
      showToast('❌ Event name is required', 'error');
      return;
    }
    setCreating(true);
    try {
      // Create local ISO strings
      const toISO = (timeStr) => timeStr ? new Date(`${newDate}T${timeStr}:00`).toISOString() : null;
      const res = await apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify({ 
          name: newName, 
          eventDate: newDate,
          startTime: toISO(startTime),
          lateTime: toISO(lateTime),
          endTime: toISO(endTime)
        }),
      });
      if (res.ok) {
        showToast('✅ Event created!', 'success');
        setShowCreate(false);
        setNewName('');
        setStartTime('19:00');
        setLateTime('19:45');
        setEndTime('23:00');
        loadEvents();
      } else {
        const data = await res.json();
        showToast(`❌ ${data.error}`, 'error');
      }
    } catch {
      showToast('❌ Failed to create event', 'error');
    }
    setCreating(false);
  };

  const toggleActive = async (event) => {
    try {
      const res = await apiFetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !event.is_active }),
      });
      if (res.ok) {
        showToast(event.is_active ? '⏸️ Event deactivated' : '▶️ Event activated!', 'success');
        loadEvents();
      }
    } catch {
      showToast('❌ Failed to update', 'error');
    }
  };

  const deleteEvent = async (event) => {
    if (!confirm(`Delete "${event.name}"? This will remove all attendance data.`)) return;
    try {
      const res = await apiFetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('🗑️ Event deleted', 'success');
        loadEvents();
      }
    } catch {
      showToast('❌ Failed to delete', 'error');
    }
  };

  const exportEvent = async (event) => {
    try {
      const res = await apiFetch(`/api/attendance/export?eventId=${event.id}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${event.name}_${event.event_date}.csv`.replace(/[^a-z0-9_.-]/gi, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('⬇️ CSV downloaded!', 'success');
    } catch {
      showToast('❌ Export failed', 'error');
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900 }}>📅 Events</h2>
        <button className="new-event-btn" onClick={() => setShowCreate(true)}>
          + New Event
        </button>
      </div>

      {/* Create Event Panel */}
      {showCreate && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-title">Create New Event</div>
          <input
            className="id-input"
            placeholder="Event name (e.g., Friday Majlis)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createEvent(); }}
            style={{ marginBottom: 10, width: '100%' }}
            autoFocus
          />
          <input
            className="id-input"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ marginBottom: 10, width: '100%' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: 10 }}>
            <div>
              <div className="text-xs text-muted mb-2">Start Time</div>
              <input
                className="id-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
              />
            </div>
            <div>
              <div className="text-xs text-muted mb-2">Late After</div>
              <input
                className="id-input"
                type="time"
                value={lateTime}
                onChange={(e) => setLateTime(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
              />
            </div>
            <div>
              <div className="text-xs text-muted mb-2">End Time</div>
              <input
                className="id-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
              />
            </div>
          </div>
          <div className="action-row">
            <button className="action-btn secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="action-btn primary" onClick={createEvent} disabled={creating}>
              {creating ? '...' : '✅ Create Event'}
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div>No events yet</div>
            <div className="text-xs text-muted mt-2">Create your first event above</div>
          </div>
        </div>
      ) : (
        events.map((ev) => (
          <div key={ev.id} className="session-card">
            <div className="session-header">
              <div>
                <div className="session-date">
                  {ev.is_active && <span style={{ color: 'var(--green)' }}>🟢 </span>}
                  {ev.name}
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  {new Date(ev.event_date).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              </div>
              <div className="session-badge">
                {ev.attendance_count || 0} scanned
              </div>
            </div>

            <div className="session-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className={`session-btn ${ev.is_active ? '' : 'primary'}`}
                onClick={() => toggleActive(ev)}
              >
                {ev.is_active ? '⏸️' : '▶️'}
              </button>
              <button className="session-btn" onClick={() => openScannerModal(ev)}>
                👤 Scanners
              </button>
              <button className="session-btn" onClick={() => openInviteModal(ev)}>
                📜 Invites
              </button>
              <button className="session-btn primary" onClick={() => exportEvent(ev)}>
                ⬇️
              </button>
              <button className="session-btn danger" onClick={() => deleteEvent(ev)}>
                🗑️
              </button>
            </div>
          </div>
        ))
      )}

      {/* Scanner Assignment Modal */}
      <Modal isOpen={showScannerModal} onClose={() => setShowScannerModal(false)} title="Assign Scanners">
        <p className="text-sm text-muted mb-3">Check the boxes to authorize scanners. If none are checked, no scanner can view or scan for this event.</p>
        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
          {allScanners.length === 0 && <div className="text-sm text-muted">No scanners exist.</div>}
          {allScanners.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={assignedScannerIds.includes(s.id)}
                onChange={() => toggleScanner(s.id)}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontSize: '15px', color: 'var(--text)' }}>📱 {s.display_name}</span>
            </label>
          ))}
        </div>
        <button className="action-btn primary" onClick={saveScanners} style={{ width: '100%' }}>✅ Save Assignments</button>
      </Modal>

      {/* Invites Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Manage Invites">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px' }}>
          <input 
            type="checkbox" 
            checked={isRestricted}
            onChange={(e) => saveRestrictedStatus(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>Restricted Event</div>
            <div className="text-xs text-muted">If checked, only invited members can scan successfully.</div>
          </div>
        </label>

        {isRestricted && (
          <>
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--green-light)', color: 'var(--green)', borderRadius: '8px', fontWeight: 'bold' }}>
              📜 Currently Invited: {inviteCount} members
            </div>
            <p className="text-sm mb-2" style={{ color: 'var(--text)' }}>Paste ITS IDs (separated by commas or new lines) to invite members. This will OVERWRITE the current list.</p>
            <textarea 
              className="id-input"
              value={inviteText}
              onChange={e => setInviteText(e.target.value)}
              placeholder="e.g. 10293847, 91827364"
              style={{ width: '100%', height: '120px', marginBottom: '10px', padding: '10px' }}
            />
            <button className="action-btn primary" onClick={saveInvites} style={{ width: '100%' }}>📤 Upload & Verify Invites</button>
          </>
        )}
      </Modal>

      {ToastComponent}
    </div>
  );
}
