'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { SkeletonRow } from '@/components/Skeleton';
import {
  Users,
  Search,
  FolderUp,
  FileText,
  Download,
  Loader2,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function MembersPage() {
  const { apiFetch } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const fileRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [loading, setLoading] = useState(true);

  // CSV Import state
  const [pendingImport, setPendingImport] = useState(null);
  const [importing, setImporting] = useState(false);

  const loadMembers = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (q.trim()) params.set('search', q);

      const res = await apiFetch(`/api/members?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Load members error:', err);
    }
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { loadMembers(1, ''); }, [loadMembers]);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => {
      loadMembers(1, val);
    }, 400));
  };

  // CSV Import
  const handleCSV = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        showToast('CSV seems empty', 'error');
        return;
      }

      const header = lines[0].split(',').map((h) =>
        h.trim().replace(/^["']+|["']+$/g, '').toLowerCase()
      );

      const findCol = (options) => {
        for (const o of options) {
          const i = header.indexOf(o);
          if (i > -1) return i;
        }
        return -1;
      };

      const colMap = {
        id: findCol(['its_id', 'itsid', 'its id', 'id']),
        name: findCol(['name', 'full name', 'fullname']),
        hfid: findCol(['hfid', 'hf_id']),
        barcode: findCol(['backbarcode', 'barcode', 'back barcode', 'gate']),
      };

      if (colMap.id === -1) {
        showToast('Could not find ITS_ID column', 'error');
        return;
      }

      const splitCSVLine = (line) => {
        const result = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') { inQ = !inQ; }
          else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
          else cur += c;
        }
        result.push(cur);
        return result;
      };

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i]);
        const id = (cols[colMap.id] || '').replace(/^["']+|["']+$/g, '').trim();
        if (!id) continue;
        parsed.push({
          its_id: id,
          name: colMap.name > -1 ? cols[colMap.name]?.replace(/^["']+|["']+$/g, '').trim() : 'Member ' + id,
          hfid: colMap.hfid > -1 ? cols[colMap.hfid]?.replace(/^["']+|["']+$/g, '').trim() : '',
          back_barcode: colMap.barcode > -1 ? cols[colMap.barcode]?.replace(/^["']+|["']+$/g, '').trim() : '',
        });
      }

      if (!parsed.length) {
        showToast('No valid rows found', 'error');
        return;
      }

      setPendingImport(parsed);
    };
    reader.readAsText(file);
  };

  const applyImport = async (mode) => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      const res = await apiFetch('/api/members', {
        method: 'POST',
        body: JSON.stringify({ members: pendingImport, mode }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${data.imported} members imported (${data.total} total)`, 'success');
        setPendingImport(null);
        loadMembers(1, '');
      } else {
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Import failed', 'error');
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const csv = 'ITS_ID,Name,HFID,BackBarcode\r\n20300001,Example Member One,aexamplehfid,1234567890\r\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jamaat_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="page-header-title" style={{ marginBottom: 14 }}>
        <Users /> Members ({total})
      </div>

      {/* Search */}
      <div className="search-wrapper" style={{ marginBottom: 10 }}>
        <span className="search-icon"><Search /></span>
        <input
          className="search-bar"
          placeholder="Search name or ITS ID…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Import CSV Panel */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-title"><FolderUp /> Import Members CSV</div>
        <div
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag');
            handleCSV(e.dataTransfer.files[0]);
          }}
        >
          <div className="upload-icon"><FileText /></div>
          <div className="upload-title">Tap to choose CSV file</div>
          <div className="upload-sub">or drag and drop here</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="upload-input"
          accept=".csv"
          onChange={(e) => handleCSV(e.target.files[0])}
        />

        {/* Import Preview */}
        {pendingImport && (
          <div style={{ marginTop: 10 }}>
            <p className="text-sm text-muted mb-2">
              Preview ({pendingImport.length} members found):
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>ITS ID</th>
                    <th>Name</th>
                    <th>HFID</th>
                    <th>Barcode</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingImport.slice(0, 5).map((m, i) => (
                    <tr key={i}>
                      <td>{m.its_id}</td>
                      <td>{m.name}</td>
                      <td>{m.hfid || '—'}</td>
                      <td>{m.back_barcode || '—'}</td>
                    </tr>
                  ))}
                  {pendingImport.length > 5 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        …and {pendingImport.length - 5} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="action-row">
              <button className="action-btn secondary" onClick={() => setPendingImport(null)} disabled={importing}>
                Cancel
              </button>
              <button className="action-btn primary" onClick={() => applyImport('replace')} disabled={importing}>
                {importing ? <Loader2 className="btn-spinner" /> : 'Replace All'}
              </button>
              <button className="action-btn accent" onClick={() => applyImport('merge')} disabled={importing}>
                {importing ? <Loader2 className="btn-spinner" /> : 'Merge / Add'}
              </button>
            </div>
          </div>
        )}

        <button className="action-btn secondary" onClick={downloadTemplate} style={{ marginTop: 10, width: '100%' }}>
          <Download /> Download CSV Template
        </button>
      </div>

      {/* Member List */}
      <div className="member-list">
        {loading ? (
          [0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} trailing={false} />)
        ) : members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users /></div>
            <div>No members found</div>
          </div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="member-card absent">
              <div className="status-dot"><User /></div>
              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-meta">
                  ITS: {m.its_id}
                  {m.hfid && ` · HFID: ${m.hfid}`}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          marginTop: 16,
          paddingBottom: 10,
        }}>
          <button
            className="session-btn"
            disabled={page <= 1}
            onClick={() => loadMembers(page - 1, search)}
          >
            <ChevronLeft /> Prev
          </button>
          <span className="text-sm font-bold text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            className="session-btn"
            disabled={page >= totalPages}
            onClick={() => loadMembers(page + 1, search)}
          >
            Next <ChevronRight />
          </button>
        </div>
      )}

      {ToastComponent}
    </div>
  );
}
