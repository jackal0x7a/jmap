import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Copy, ExternalLink, X, Check } from 'lucide-react';
import { api } from '../api/client.js';

const SEV_COLOR = {
  critical: 'var(--red)', high: 'var(--orange)',
  medium: 'var(--yellow)', low: 'var(--accent)', info: 'var(--text-dim)'
};

const FINDING_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'api_paths', label: 'API Paths' },
  { value: 'relative_paths', label: 'Relative Paths' },
  { value: 'absolute_urls', label: 'Absolute URLs' },
  { value: 'aws_access_key', label: 'AWS Keys' },
  { value: 'google_api_key', label: 'Google API' },
  { value: 'github_token', label: 'GitHub Tokens' },
  { value: 'jwt_token', label: 'JWT Tokens' },
  { value: 'bearer_token', label: 'Bearer Tokens' },
  { value: 'stripe_key', label: 'Stripe Keys' },
  { value: 'hardcoded_password', label: 'Passwords' },
  { value: 'internal_ip', label: 'Internal IPs' },
  { value: 'localhost_url', label: 'Localhost URLs' },
  { value: 'graphql_query', label: 'GraphQL' },
  { value: 'firebase_config', label: 'Firebase' },
];

const glassInput = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10, padding: '8px 12px 8px 34px',
  color: 'var(--text)', fontSize: 13, outline: 'none',
  fontFamily: 'var(--font-sans)', transition: 'border-color .2s',
};

export default function FindingsPage() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const severity = searchParams.get('severity') || '';
  const type = searchParams.get('type') || '';

  const load = (s = search, sev = severity, t = type) => {
    setLoading(true);
    api.getFindings({ search: s, severity: sev, type: t })
      .then(f => { setFindings(f); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [severity, type]);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const setSev = (s) => {
    const p = new URLSearchParams(searchParams);
    if (s) p.set('severity', s); else p.delete('severity');
    setSearchParams(p);
  };

  const setType = (t) => {
    const p = new URLSearchParams(searchParams);
    if (t) p.set('type', t); else p.delete('type');
    setSearchParams(p);
  };

  const copyValue = (id, value) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sevCounts = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {});

  const thStyle = {
    padding: '11px 16px', textAlign: 'left', fontSize: 10,
    color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1.2,
    textTransform: 'uppercase', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 3 }}>All Findings</h1>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{findings.length} findings across all captured files</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search findings…"
            style={glassInput}
           onFocus={e => (e.target.style.backgroundColor = 'rgba(255,255,255,0.09)')}
            onBlur={e => (e.target.style.backgroundColor = 'rgba(255,255,255,0.05)')}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', padding: 2 }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Severity pills */}
        <div style={{
          display: 'flex', gap: 3,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: 3,
        }}>
          {['', 'critical', 'high', 'medium', 'low', 'info'].map(s => (
            <button key={s} onClick={() => setSev(s)} style={{
              background: severity === s ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: `1px solid ${severity === s ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
              color: s ? SEV_COLOR[s] : (severity === s ? '#fff' : 'var(--text-dim)'),
              borderRadius: 7, padding: '4px 11px', fontSize: 11,
              textTransform: 'capitalize', cursor: 'pointer', transition: '.12s',
              fontFamily: 'var(--font-mono)', fontWeight: severity === s ? 600 : 400,
            }}>
              {s || 'All'}{s && sevCounts[s] ? ` ${sevCounts[s]}` : ''}
            </button>
          ))}
        </div>

        {/* Type select */}
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: 'var(--text)', borderRadius: 10,
            padding: '8px 12px', fontSize: 12, outline: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {FINDING_TYPES.map(t => (
            <option key={t.value} value={t.value} style={{ background: '#0f1320' }}>{t.label}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(severity || type || search) && (
          <button onClick={() => { setSev(''); setType(''); setSearch(''); }} style={{
            background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
            color: 'var(--red)', borderRadius: 9, padding: '7px 12px',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, transition: '.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.08)'}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['Severity', 'Type', 'Value', 'Source File', 'Line', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </td></tr>
            ) : findings.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No findings match your filters.
              </td></tr>
            ) : (
              findings.map((f, i) => (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: i < findings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: '.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '9px 16px' }}>
                    <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                  </td>
                  <td style={{ padding: '9px 16px', fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {f.label}
                  </td>
                  <td style={{ padding: '9px 16px', maxWidth: 380 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: SEV_COLOR[f.severity] || 'var(--text-dim)',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 6, padding: '3px 9px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }} title={f.value}>{f.value}</div>
                  </td>
                  <td style={{ padding: '9px 16px', maxWidth: 200 }}>
                    <div
                      onClick={() => navigate(`/files/${f.file_id}`)}
                      style={{
                        fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                      title={f.file_url}
                    >
                      {(f.file_url || '').replace(/^https?:\/\//, '').slice(0, 40)}
                    </div>
                  </td>
                  <td style={{ padding: '9px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {f.line_number}
                  </td>
                  <td style={{ padding: '9px 16px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => copyValue(f.id, f.value)}
                        style={{
                          background: copied === f.id ? 'rgba(0,232,122,0.1)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${copied === f.id ? 'rgba(0,232,122,0.25)' : 'rgba(255,255,255,0.09)'}`,
                          color: copied === f.id ? 'var(--green)' : 'var(--text-dim)',
                          borderRadius: 7, padding: '4px 9px', fontSize: 11,
                          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: '.15s',
                        }}
                      >
                        {copied === f.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                      </button>
                      <button
                        onClick={() => navigate(`/files/${f.file_id}`)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.09)',
                          color: 'var(--text-dim)',
                          borderRadius: 7, padding: '4px 9px', fontSize: 11,
                          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: '.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                      >
                        <ExternalLink size={10} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
