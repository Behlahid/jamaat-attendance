'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Skeleton, SkeletonStats, SkeletonList } from '@/components/Skeleton';
import {
  CalendarX2,
  Radio,
  CheckCircle2,
  Nfc,
  Keyboard,
  Download,
  History,
} from 'lucide-react';

const logError = (context, err) => {
  console.error(`[AdminDashboard] ${context}:`, {
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
  });
};

export default function AdminDashboard() {
  const { apiFetch } = useAuth();
  const [activeEvent, setActiveEvent] = useState(null);
  const [stats, setStats] = useState({ present: 0, total: 0, absent: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Load events and stats
  const loadData = useCallback(async () => {
    try {
      const evRes = await apiFetch('/api/events');
      const evData = await evRes.json();
      setEvents(evData.events || []);

      const active = (evData.events || []).find((e) => e.is_active);
      setActiveEvent(active || null);

      if (active) {
        const attRes = await apiFetch(`/api/attendance?eventId=${active.id}`);
        const attData = await attRes.json();
        setStats({
          present: attData.present || 0,
          total: attData.total || 0,
          absent: attData.absent || 0,
        });
        setRecentScans((attData.attendance || []).slice(0, 15));
      }
    } catch (err) {
      logError('loadData', err);
      setError('Failed to load dashboard data. Please try again later.');
    }
    setLoadingData(false);
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription for live scanning updates
  useEffect(() => {
    if (!activeEvent) return;

    const channel = supabase
      .channel('live-attendance')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `event_id=eq.${activeEvent.id}`,
        },
        (payload) => {
          try {
            const newRecord = payload.new;
            setRecentScans((prev) => [newRecord, ...prev].slice(0, 15));
            setStats((prev) => ({
              ...prev,
              present: prev.present + 1,
              absent: prev.absent - 1,
            }));
          } catch (err) {
            logError('realtime subscription', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeEvent]);

  // Export CSV
  const exportCSV = async () => {
    if (!activeEvent) return;
    try {
      const res = await apiFetch(`/api/attendance/export?eventId=${activeEvent.id}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${activeEvent.name}_${activeEvent.event_date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
        logError('exportCSV', err);
        setError('Failed to export CSV. Please try again.');
    }
  };

  const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  if (loadingData) {
    return (
      <div className="page-container">
        <div className="skeleton-row" style={{ marginBottom: 14 }}>
          <div className="skeleton-row-text">
            <Skeleton width={90} height={9} />
            <Skeleton width="60%" height={14} />
          </div>
          <Skeleton width={60} height={12} />
        </div>
        <SkeletonStats />
        <div className="panel">
          <Skeleton width={160} height={12} style={{ marginBottom: 12 }} />
          <Skeleton height={10} style={{ borderRadius: 5 }} />
        </div>
        <div className="panel">
          <Skeleton width={140} height={12} style={{ marginBottom: 14 }} />
          <SkeletonList rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Active Event Card */}
      {activeEvent ? (
        <div className="event-bar">
          <div>
            <div className="event-label">
              <span className="live-badge"><span className="live-dot" />LIVE EVENT</span>
            </div>
            <div className="event-name">{activeEvent.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="event-label">
              {new Date(activeEvent.event_date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short',
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="panel empty-state">
          <div className="empty-icon"><CalendarX2 /></div>
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>No Active Event</div>
          <div className="text-muted text-sm">
            Go to Events tab to create and activate one.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card present">
          <div className="stat-num">{stats.present}</div>
          <div className="stat-label">Present</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card absent">
          <div className="stat-num">{stats.absent}</div>
          <div className="stat-label">Absent</div>
        </div>
      </div>

      {/* Progress Bar */}
      {activeEvent && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="text-sm font-bold">Attendance Progress</span>
            <span className="text-sm font-bold" style={{ color: 'var(--green)' }}>{percentage}%</span>
          </div>
          <div style={{
            height: 10,
            background: 'var(--bg)',
            borderRadius: 5,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, var(--green), var(--green-mid))',
              borderRadius: 5,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Live Scan Feed */}
      {activeEvent && (
        <div className="panel">
          <div className="panel-title"><Radio /> Live Scan Feed</div>
          {recentScans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Radio /></div>
              <div>Waiting for scans…</div>
              <div className="text-xs text-muted mt-2">
                Scans will appear here in real-time
              </div>
            </div>
          ) : (
            <div className="member-list">
              {recentScans.map((scan, i) => (
                <div key={scan.id || i} className="member-card present" style={{
                  animation: i === 0 ? 'justMarked 0.6s ease' : 'none',
                }}>
                  <div className="status-dot"><CheckCircle2 /></div>
                  <div className="member-info">
                    <div className="member-name">{scan.member_name}</div>
                    <div className="member-meta">
                      ITS: {scan.its_id} ·{' '}
                      <span className="meta-icon">{scan.method === 'nfc' ? <Nfc /> : <Keyboard />}</span>
                      {scan.method === 'nfc' ? 'NFC' : 'Manual'}
                      {scan.profiles?.display_name && ` · by ${scan.profiles.display_name}`}
                    </div>
                  </div>
                  <div className="member-time">
                    {new Date(scan.marked_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      {activeEvent && stats.present > 0 && (
        <div className="export-row">
          <button className="export-btn gold" onClick={exportCSV}>
            <Download /> Export Attendance CSV
          </button>
        </div>
      )}

      {/* Past Events Summary */}
      {events.filter((e) => !e.is_active).length > 0 && (
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="panel-title"><History /> Recent Events</div>
          {events.filter((e) => !e.is_active).slice(0, 5).map((ev) => (
            <div key={ev.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--border-light)',
            }}>
              <div>
                <div className="text-sm font-bold">{ev.name}</div>
                <div className="text-xs text-muted">
                  {new Date(ev.event_date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
              </div>
              <div className="session-badge">{ev.attendance_count || 0} present</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
