import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, RefreshCw, AlertTriangle, FileCode, X } from 'lucide-react';
import { api } from '../api/client.js';

const SEV_COLOR = {
  critical: 'var(--red)', high: 'var(--orange)', medium: 'var(--yellow)',
  low: 'var(--accent)', info: 'var(--text-dim)', 0: '#fff'
};

function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function maxSevLabel(num) {
  if (num >= 4) return 'critical';
  if (num === 3) return 'high';
  if (num === 2) return 'medium';
  if (num === 1) return 'low';
  return null;
}

// Inline confirm for file delete (lightweight)
function DeleteFileModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(6,8,16,0.55)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.18s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(15,19,32,0.80)',
        backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 16, padding: '22px 24px', width: 340,
        boxShadow: '0 20px 56px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
        animation: 'scaleIn 0.18s ease',
      }}>
        <div style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 8 }}>Delete this file?</div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 18, lineHeight: 1.6 }}>
          This will permanently remove the JS file and all its findings.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', transition: '.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--red)', transition: '.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--red-dim)'}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}

const glassInput = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10, padding: '9px 12px 9px 36px',
  color: 'var(--text)', fontSize: 13, outline: 'none',
  fontFamily: 'var(--font-sans)',
  transition: 'border-color .2s',
};

export default function FilesPage({ onRefresh }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const navigate = useNavigate();

  const load = (q = '') => {
    setLoading(true);
    api.getFiles({ search: q }).then(f => { setFiles(f); setLoading(false); });
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = async (id) => {
    setConfirmId(null);
    setDeletingId(id);
    await api.deleteFile(id);
    setFiles(f => f.filter(x => x.id !== id));
    onRefresh?.();
    setDeletingId(null);
  };

  const thStyle = {
    padding: '11px 16px', textAlign: 'left', fontSize: 10,
    color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1.2,
    textTransform: 'uppercase', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.25s ease' }}>
      <DeleteFileModal
        open={!!confirmId}
        onConfirm={() => handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Captured JS Files</h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{files.length} files captured</p>
        </div>
        <button onClick={() => load(search)} style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text-dim)',
          borderRadius: 9, padding: '7px 14px',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, transition: '.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by URL or source page…"
          style={glassInput}
          onFocus={e => (e.target.style.backgroundColor = 'rgba(255,255,255,0.09)')}
          onBlur={e => (e.target.style.backgroundColor = 'rgba(255,255,255,0.05)')}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--text-muted)', padding: 2,
          }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Table */}
      <div  style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['JS File URL', 'Size', 'Findings', 'Source Page', 'Captured'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </td></tr>
            ) : files.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCode size={24} color="var(--text-muted)" />
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No JS files captured yet</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Make sure your scope is set in the extension.</div>
                </div>
              </td></tr>
            ) : (
              files.map((f, i) => {
                const sev = maxSevLabel(f.max_severity_num);
                return (
                  <tr
                    key={f.id}
                    onClick={() => navigate(`/files/${f.id}`)}
                    style={{
                      borderBottom: i < files.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      cursor: 'pointer', transition: '.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px', maxWidth: 300 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }} title={f.url}>
                        {f.url.replace(/^https?:\/\//, '')}
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {formatBytes(f.size)}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {f.finding_count > 0 ? (
                        <span className={`badge badge-${sev || 'info'}`}>
                          <AlertTriangle size={9} />{f.finding_count}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px', maxWidth: 200 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.source_page}>
                        {f.source_page ? f.source_page.replace(/^https?:\/\//, '') : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(f.captured_at)}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmId(f.id); }}
                        disabled={deletingId === f.id}
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-muted)',
                          padding: 4, borderRadius: 5, display: 'flex', transition: '.15s', opacity: deletingId === f.id ? 0.4 : 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
