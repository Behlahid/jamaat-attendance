import { useState, useEffect, useCallback } from 'react';
import { playSuccess, playLate, playError } from '@/lib/audio';

export function useScanEvent(apiFetch, showToast) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [lastScan, setLastScan] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [, setClockTick] = useState(0);

  // Why: Re-evaluates time-based locks (like scan opening time) without a full re-render cycle
  useEffect(() => {
    const timer = setInterval(() => setClockTick((c) => c + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const eventNotStarted = !!(activeEvent?.start_time && new Date() < new Date(activeEvent.start_time));

  const loadActiveEvent = useCallback(async () => {
    try {
      const res = await apiFetch('/api/events?active=true');
      const data = await res.json();
      
      if (data.events?.length > 0) {
        const event = data.events[0];
        setActiveEvent(event);
        setScanCount(event.present || 0);
        setTotalMembers(event.total_members || 0);
      }
    } catch (err) {
      console.error('Failed to load event:', err);
    } finally {
      setLoadingEvent(false);
    }
  }, [apiFetch]);

  const markAttendance = async (id, gate, method = 'manual') => {
    if (!activeEvent || eventNotStarted || !gate || !id.trim()) {
      if (!gate && activeEvent && !eventNotStarted) {
        showToast('Please select a gate first', 'error');
        playError();
      }
      return false; 
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ eventId: activeEvent.id, identifier: id.trim(), method, gate }),
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
        if (navigator.vibrate) navigator.vibrate(100);
        return true;
      } 
      
      // Handle Errors
      const shortName = data.member?.name?.split(' ').slice(0, 3).join(' ') || id;
      showToast(res.status === 409 ? `Already marked: ${shortName}` : `${data.error}: ${id}`, 'error');
      playError();
      if (navigator.vibrate) navigator.vibrate(res.status === 409 ? [50, 50, 50] : [100, 50, 100]);
      
      return false;
    } catch (err) {
      showToast('Network error', 'error');
      playError();
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    activeEvent,
    scanCount,
    totalMembers,
    lastScan,
    loadingEvent,
    submitting,
    eventNotStarted,
    loadActiveEvent,
    markAttendance
  };
}
