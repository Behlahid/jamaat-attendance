import { MapPin, PlayCircle, AlertTriangle, StopCircle, DoorOpen, ChevronDown, UserCheck, Users, UserX, ScanLine, CheckCircle2 } from 'lucide-react';

export function EventHeader({ event }) {
  if (!event) return null;
  const { name, event_date, start_time, late_time, end_time } = event;
  
  const formatTime = (isoString) => isoString ? new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set';

  return (
    <>
      <div className="event-bar">
        <div>
          <div className="event-label">Active Event</div>
          <div className="event-name"><MapPin /> {name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="event-label">
            {new Date(event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {(start_time || end_time || late_time) && (
        <div className="time-panel">
          <div className="time-row start">
            <span className="time-row-icon"><PlayCircle /></span>
            <span className="time-row-label">Starts</span>
            <span className="time-row-value">{formatTime(start_time)}</span>
          </div>
          <div className="time-row late">
            <span className="time-row-icon"><AlertTriangle /></span>
            <span className="time-row-label">Late After</span>
            <span className="time-row-value">{formatTime(late_time)}</span>
          </div>
          <div className="time-row end">
            <span className="time-row-icon"><StopCircle /></span>
            <span className="time-row-label">Ends</span>
            <span className="time-row-value">{formatTime(end_time)}</span>
          </div>
        </div>
      )}
    </>
  );
}

export function GateSelector({ gate, onChange }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', marginBottom: '14px' }}>
      <div className="field-icon-wrap">
        <span className="field-icon"><DoorOpen /></span>
        <select value={gate} onChange={onChange} className="gate-select">
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
  );
}

export function ScannerStats({ present, total }) {
  return (
    <div className="stats-row">
      <div className="stat-card present">
        <span className="stat-icon"><UserCheck /></span>
        <div className="stat-num">{present}</div>
        <div className="stat-label">Scanned</div>
      </div>
      <div className="stat-card">
        <span className="stat-icon"><Users /></span>
        <div className="stat-num">{total}</div>
        <div className="stat-label">Total</div>
      </div>
      <div className="stat-card absent">
        <span className="stat-icon"><UserX /></span>
        <div className="stat-num">{total - present}</div>
        <div className="stat-label">Remaining</div>
      </div>
    </div>
  );
}
