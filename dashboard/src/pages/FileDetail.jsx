import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Copy, ExternalLink, Check } from 'lucide-react';
import { api } from '../api/client.js';

const SEV_COLOR = {
  critical: 'var(--red)', high: 'var(--orange)',
  medium: 'var(--yellow)', low: 'var(--accent)', info: 'var(--text-dim)'
};

function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

const btnBase = {
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 9, color: 'var(--text-dim)',
  padding: '6px 12px', display: 'flex', alignItems: 'center',
  gap: 5, fontSize: 12, transition: '.15s', cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
};

export default function FileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedFinding, setCopiedFinding] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    Promise.all([api.getFile(id), api.getFileFinding(id)])
      .then(([f, fn]) => { setFile(f); setFindings(fn); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const reanalyze = async () => {
    setReanalyzing(true);
    const res = await api.analyzeFile(id);
    setFindings(res.results || []);
    setReanalyzing(false);
  };

  const copyContent = () => {
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToLine = (lineNum) => {
    if (!contentRef.current) return;
    const lines = contentRef.current.querySelectorAll('.code-line');
    const line = lines[lineNum - 1];
    if (line) {
      line.scrollIntoView({ behavior: 'smooth', block: 'center' });
      line.style.background = 'rgba(0,232,122,0.08)';
      line.style.borderLeft = '2px solid var(--green)';
      setTimeout(() => { line.style.background = ''; line.style.borderLeft = ''; }, 2500);
    }
  };

  if (loading) return (
    <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!file) return (
    <div style={{ padding: 40, color: 'var(--red)', fontSize: 13 }}>File not found</div>
  );

  const filteredFindings = severityFilter ? findings.filter(f => f.severity === severityFilter) : findings;
  const sevCounts = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {});
  const codeLines = file.content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(10,13,20,0.8)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)',
      }}>
        <button onClick={() => navigate('/files')} style={btnBase}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
        >
          <ArrowLeft size={13} /> Back
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{file.url}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {formatBytes(file.size)} · {codeLines.length} lines · {findings.length} findings
          </div>
        </div>

        <a href={file.url} target="_blank" rel="noreferrer" style={btnBase}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
        >
          <ExternalLink size={13} /> Open
        </a>

        <button onClick={copyContent} style={{
          ...btnBase,
          color: copied ? 'var(--green)' : 'var(--text-dim)',
          background: copied ? 'rgba(0,232,122,0.1)' : 'rgba(255,255,255,0.05)',
          borderColor: copied ? 'rgba(0,232,122,0.25)' : 'rgba(255,255,255,0.09)',
        }}>
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>

        <button onClick={reanalyze} disabled={reanalyzing} style={{
          ...btnBase,
          background: 'rgba(0,232,122,0.1)',
          border: '1px solid rgba(0,232,122,0.22)',
          color: 'var(--green)',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,232,122,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,232,122,0.1)'}
        >
          <RefreshCw size={13} style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }} />
          {reanalyzing ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Code viewer */}
        <div style={{
          flex: 1, overflow: 'auto',
          background: 'rgba(6,8,16,0.7)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            padding: '12px 0',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.75,
            color: '#8896a6',
          }} ref={contentRef}>
            {codeLines.map((line, i) => (
              <div key={i} className="code-line" style={{ display: 'flex', transition: 'background 0.3s, border-left 0.3s' }}>
                <span style={{
                  width: 52, flexShrink: 0, textAlign: 'right', paddingRight: 18,
                  color: 'rgba(255,255,255,0.12)', userSelect: 'none', fontSize: 11,
                }}>{i + 1}</span>
                <span style={{ flex: 1, paddingRight: 16, whiteSpace: 'pre', overflowX: 'auto', color: '#b8c8d8' }}>
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Findings panel */}
        <div style={{
          width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'rgba(10,13,20,0.6)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          {/* Severity tabs */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4,
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            {['', 'critical', 'high', 'medium', 'low', 'info'].map(s => {
              const count = s ? (sevCounts[s] || 0) : findings.length;
              if (s && !count) return null;
              const active = severityFilter === s;
              return (
                <button key={s} onClick={() => setSeverityFilter(s)} style={{
                  background: active ? (s ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)') : 'transparent',
                  border: `1px solid ${active ? (SEV_COLOR[s] || 'rgba(255,255,255,0.2)') : 'transparent'}`,
                  color: s ? (SEV_COLOR[s] || 'var(--text-dim)') : (active ? '#fff' : 'var(--text-muted)'),
                  borderRadius: 7, padding: '3px 10px', fontSize: 10,
                  fontFamily: 'var(--font-mono)', textTransform: 'capitalize',
                  cursor: 'pointer', transition: '.12s', fontWeight: active ? 600 : 400,
                }}>
                  {s || 'All'} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Findings list */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredFindings.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                {findings.length === 0 ? 'No findings detected.' : 'No findings match this filter.'}
              </div>
            ) : (
              filteredFindings.map(f => {
                const isSelected = selectedFinding === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => { setSelectedFinding(isSelected ? null : f.id); scrollToLine(f.line_number); }}
                    style={{
                      padding: '11px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                      transition: '.12s',
                      borderLeft: isSelected ? `2px solid ${SEV_COLOR[f.severity] || 'transparent'}` : '2px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span className={`badge badge-${f.severity}`} style={{ fontSize: 9, padding: '2px 7px' }}>
                        {f.severity}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{f.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        L{f.line_number}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: SEV_COLOR[f.severity] || 'var(--text-dim)',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 6, padding: '5px 9px',
                      wordBreak: 'break-all',
                      maxHeight: isSelected ? 200 : 48,
                      overflow: 'hidden',
                      transition: 'max-height 0.25s ease',
                    }}>
                      {f.value}
                    </div>
                    {isSelected && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(f.value);
                          setCopiedFinding(f.id);
                          setTimeout(() => setCopiedFinding(null), 2000);
                        }}
                        style={{
                          marginTop: 7, background: copiedFinding === f.id ? 'rgba(0,232,122,0.08)' : 'transparent',
                          border: 'none', color: copiedFinding === f.id ? 'var(--green)' : 'var(--text-muted)',
                          fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0',
                          fontFamily: 'var(--font-sans)', transition: '.15s',
                        }}
                      >
                        {copiedFinding === f.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy value</>}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
