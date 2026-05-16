import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, RefreshCw, Code, X, Wifi, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';

const METHOD_COLORS = {
  GET:     'var(--green)',
  POST:    'var(--accent)',
  PUT:     'var(--yellow)',
  DELETE:  'var(--red)',
  PATCH:   'var(--orange)',
  OPTIONS: 'var(--purple)',
};

const glassInput = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10,
  padding: '9px 12px 9px 36px',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  transition: 'border-color .2s',
};

const selectBox = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 10,
  padding: '9px 12px',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)',
  transition: 'border-color .2s, background .2s, box-shadow .2s',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 30,
};

const TAB_JS       = 'js';
const TAB_OBSERVED = 'observed';

function ConfirmClearModal({ open, onConfirm, onCancel }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <div
        onClick={onCancel}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(6,8,16,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(15,19,32,0.95)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 18,
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'scaleIn 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          pointerEvents: 'none',
        }} />

        <div style={{
          padding: '18px 22px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Clear Traffic</span>
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: 'var(--text-dim)', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: '.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <ShieldAlert size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--red)', fontSize: 13 }}>This action cannot be undone</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 3 }}>All captured live traffic for this project will be permanently removed.</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>
              Clear all observed requests for this project?
            </p>
          </div>
        </div>

        <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 500,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text)', cursor: 'pointer', transition: '.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.35)',
              color: 'var(--red)', cursor: 'pointer', transition: '.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-dim)'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={13} /> Clear
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function EndpointsPage({ onRefresh }) {
  const [tab, setTab]                   = useState(TAB_OBSERVED);
  const [endpoints, setEndpoints]       = useState([]);
  const [observed, setObserved]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [clearing, setClearing]         = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const loadEndpoints = async (q = '', method = '') => {
    setLoading(true);
    try {
      const params = { search: q };
      if (method) params.method = method;
      params.found_in_js = '1';
      setEndpoints(await api.getEndpoints(params));
    } catch { setEndpoints([]); }
    setLoading(false);
  };

  const loadObserved = async (q = '', method = '', type = '') => {
    setLoading(true);
    try {
      const params = { search: q };
      if (method) params.method = method;
      if (type)   params.type   = type;
      setObserved(await api.getObservedRequests(params));
    } catch { setObserved([]); }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === TAB_JS)       loadEndpoints(search, methodFilter);
    if (tab === TAB_OBSERVED) loadObserved(search, methodFilter, typeFilter);
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === TAB_JS)       loadEndpoints(search, methodFilter);
      if (tab === TAB_OBSERVED) loadObserved(search, methodFilter, typeFilter);
    }, 300);
    return () => clearTimeout(t);
  }, [search, methodFilter, typeFilter]);

  const refresh = () => {
    setSearch(''); setMethodFilter(''); setTypeFilter('');
    if (tab === TAB_JS)       loadEndpoints();
    if (tab === TAB_OBSERVED) loadObserved();
  };

  const handleClear = async () => {
    setShowClearModal(false);
    setClearing(true);
    try { await api.clearObservedRequests(); await loadObserved(); } catch {}
    setClearing(false);
  };

  const switchTab = (t) => {
    setTab(t);
    setSearch(''); setMethodFilter(''); setTypeFilter('');
  };

  const rows          = tab === TAB_JS ? endpoints : observed;
  const uniqueMethods = [...new Set(rows.map(r => r.method).filter(Boolean))].sort();
  const uniqueTypes   = [...new Set(observed.map(r => r.request_type).filter(Boolean))].sort();

  const thStyle = {
    padding: '11px 16px', textAlign: 'left', fontSize: 10,
    color: 'var(--text-muted)', fontWeight: 600,
    letterSpacing: 1.2, textTransform: 'uppercase', whiteSpace: 'nowrap',
  };

  const tabBtn = (active) => ({
    padding: '7px 18px',
    borderRadius: 8,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: '.15s',
    background: active ? 'rgba(0,232,122,0.15)' : 'rgba(255,255,255,0.04)',
    color:      active ? 'var(--green)'          : 'var(--text-dim)',
  });

  const typeColor = (type) => {
    if (type === 'navigation') return 'var(--green)';
    if (type === 'xhr')        return 'var(--accent)';
    if (type === 'fetch')      return 'var(--yellow)';
    if (type === 'websocket')  return 'var(--purple)';
    return 'var(--text-muted)';
  };

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.25s ease' }}>

      <ConfirmClearModal
        open={showClearModal}
        onConfirm={handleClear}
        onCancel={() => setShowClearModal(false)}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
            Discovered Endpoints
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {tab === TAB_JS
              ? `${endpoints.length} endpoints extracted from JS`
              : `${observed.length} requests observed in browser`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === TAB_OBSERVED && (
            <button
              onClick={() => setShowClearModal(true)}
              disabled={clearing}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'var(--red)',
                borderRadius: 9, padding: '7px 14px',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, cursor: 'pointer',
              }}
            >
              {clearing ? 'Clearing...' : <><Trash2 size={12} /> Clear</>}
            </button>
          )}
          <button
            onClick={refresh}
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'var(--text-dim)', borderRadius: 9,
              padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, cursor: 'pointer', transition: '.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        
           <button style={tabBtn(tab === TAB_OBSERVED)} onClick={() => switchTab(TAB_OBSERVED)}>
          <Wifi size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          Live Traffic
        </button>
        <button style={tabBtn(tab === TAB_JS)} onClick={() => switchTab(TAB_JS)}>
          <Code size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          JS Extracted
        </button>
     
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === TAB_JS ? 'Search endpoints...' : 'Search URLs...'}
            style={glassInput}
            onFocus={e => (e.target.style.backgroundColor = 'rgba(255,255,255,0.09)')}
            onBlur={e => (e.target.style.backgroundColor = 'rgba(255,255,255,0.05)')}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', padding: 2, cursor: 'pointer' }}>
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          style={{ ...selectBox, minWidth: 140, flex: '0 0 auto', width: 'auto' }}
        >
          <option value="" style={{ background: '#0f1320' }}>All Methods</option>
          {uniqueMethods.map(m => <option key={m} value={m} style={{ background: '#0f1320' }}>{m}</option>)}
        </select>

        {tab === TAB_OBSERVED && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ ...selectBox, minWidth: 150, flex: '0 0 auto', width: 'auto' }}
           
          >
            <option value="" style={{ background: '#0f1320' }}>All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t} style={{ background: '#0f1320' }}>{t}</option>)}
          </select>
        )}
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {tab === TAB_JS
                ? ['Method', 'Endpoint', 'Source', 'File/Location'].map(h => <th key={h} style={thStyle}>{h}</th>)
                : ['Method', 'URL', 'Type', 'Status', 'Source Page'].map(h => <th key={h} style={thStyle}>{h}</th>)
              }
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </td></tr>

            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tab === TAB_JS ? <Code size={24} color="var(--text-muted)" /> : <Wifi size={24} color="var(--text-muted)" />}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                    {tab === TAB_JS ? 'No endpoints extracted yet' : 'No live traffic captured yet'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {tab === TAB_JS
                      ? 'Endpoints appear as JS files are captured'
                      : 'Browse the target and navigations and API calls will appear here'}
                  </div>
                </div>
              </td></tr>

            ) : tab === TAB_JS ? (
              endpoints.map((ep, i) => (
                <tr key={ep.id}
                  style={{ borderBottom: i < endpoints.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: '.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, background: `${METHOD_COLORS[ep.method] || 'var(--text-dim)'}15`, color: METHOD_COLORS[ep.method] || 'var(--text-dim)', border: `1px solid ${METHOD_COLORS[ep.method] || 'var(--text-dim)'}30` }}>
                      {ep.method}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', maxWidth: 400 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ep.endpoint}>
                      {ep.endpoint}
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', background: 'rgba(0,232,122,0.12)', color: 'var(--green)', border: '1px solid rgba(0,232,122,0.25)' }}>
                      <Code size={10} /> JS
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', maxWidth: 300 }}>
                    {ep.file_url ? (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ep.file_url}>
                        {ep.file_url.replace(/^https?:\/\//, '')}
                        {ep.line_number && <span style={{ opacity: 0.6 }}>:{ep.line_number}</span>}
                      </div>
                    ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>}
                  </td>
                </tr>
              ))

            ) : (
              observed.map((ob, i) => (
                <tr key={ob.id}
                  style={{ borderBottom: i < observed.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: '.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, background: `${METHOD_COLORS[ob.method] || 'var(--text-dim)'}15`, color: METHOD_COLORS[ob.method] || 'var(--text-dim)', border: `1px solid ${METHOD_COLORS[ob.method] || 'var(--text-dim)'}30` }}>
                      {ob.method || 'GET'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', maxWidth: 420 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ob.url}>
                      {ob.url.replace(/^https?:\/\//, '')}
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', color: typeColor(ob.request_type), background: `${typeColor(ob.request_type)}18`, border: `1px solid ${typeColor(ob.request_type)}30` }}>
                      {ob.request_type || 'other'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {ob.status_code ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: ob.status_code < 300 ? 'var(--green)' : ob.status_code < 400 ? 'var(--yellow)' : 'var(--red)' }}>
                        {ob.status_code}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>}
                  </td>
                  <td style={{ padding: '11px 16px', maxWidth: 280 }}>
                    {ob.source_page ? (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ob.source_page}>
                        {ob.source_page.replace(/^https?:\/\//, '')}
                      </div>
                    ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>}
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
