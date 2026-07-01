import { MapPin, PlayCircle, AlertTriangle, StopCircle, DoorOpen, ChevronDown, UserCheck, Users, UserX, ScanLine, CheckCircle2 } from 'lucide-react';

export function EventHeader({ event }) {
  if (!event) return null;
  const { name, event_date } = event;
  
  return (
    <div className="compact-event-header">
      <div className="ceh-main">
        <MapPin size={16} />
        <span className="ceh-name">{name}</span>
      </div>
      <div className="ceh-date">
        {new Date(event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </div>
    </div>
  );
}

export function GateSelector({ gate, onChange }) {
  return (
    <div className="compact-gate-selector">
      <DoorOpen size={16} className="cgs-icon" />
      <select value={gate} onChange={onChange} className="cgs-select" aria-label="Select your gate">
        <option value="" disabled>Select gate...</option>
        <option value="Gents Main Gate">Gents Main Gate</option>
        <option value="Gents Gate 2">Gents Gate 2</option>
        <option value="Ladies Main Gate">Ladies Main Gate</option>
        <option value="Ladies Gate 2">Ladies Gate 2</option>
        <option value="VIP Gate">VIP Gate</option>
        <option value="Office">Office / Late Entry</option>
      </select>
      <ChevronDown size={16} className="cgs-chevron" />
    </div>
  );
}

export function ScannerStats({ present, total }) {
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  return (
    <div className="compact-stats">
      <div className="cs-labels">
        <span className="cs-label"><UserCheck size={14}/> Scanned: {present}</span>
        <span className="cs-label"><UserX size={14}/> Remaining: {total - present}</span>
      </div>
      <div className="cs-bar-wrap">
        <div className="cs-bar-fill" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
