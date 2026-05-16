import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode, AlertTriangle, ShieldAlert, Activity, FolderOpen, Zap } from 'lucide-react';

const SEV_COLORS = {
  critical: 'var(--red)', high: 'var(--orange)', medium: 'var(--yellow)',
  low: 'var(--accent)', info: 'var(--text-dim)'
};
const SEV_DIM = {
  critical: 'var(--red-dim)', high: 'var(--orange-dim)', medium: 'var(--yellow-dim)',
  low: 'var(--accent-dim)', info: 'rgba(255,255,255,0.04)'
};

function StatCard({ label, value, sub, color, dim, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all .2s ease',
        position: 'relative', overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {/* Color glow bg */}
      <div style={{
        position: 'absolute', bottom: -20, right: -10,
        width: 80, height: 80,
        background: dim || 'rgba(255,255,255,0.03)',
        borderRadius: '50%',
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
      {/* Top shine */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      }} />

      <div style={{ position: 'absolute', top: 16, right: 16, opacity: 0.25 }}>
        <Icon size={24} color={color || 'var(--text)'} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ stats, activeProject, onRefresh }) {
  const navigate = useNavigate();
  const criticalCount = stats?.bySeverity?.find(s => s.severity === 'critical')?.count || 0;
  const highCount = stats?.bySeverity?.find(s => s.severity === 'high')?.count || 0;

  if (!activeProject) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '80vh', gap: 20, textAlign: 'center',
        padding: 40, animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
        }}>
          <FolderOpen size={32} color="var(--text-muted)" />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No active project</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, maxWidth: 380, lineHeight: 1.7 }}>
            Create a project using the dropdown in the sidebar. The extension will automatically send
            captured JS files into whichever project is active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{activeProject.name}</h1>
          <span style={{
            fontSize: 10, color: 'var(--green)',
            background: 'rgba(0,232,122,0.12)',
            border: '1px solid rgba(0,232,122,0.22)',
            padding: '3px 9px', borderRadius: 20, fontWeight: 600, letterSpacing: 0.5,
          }}>ACTIVE</span>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>Live summary of captured JS files and findings</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="JS Files"  value={stats?.totalFiles}    icon={FileCode}    color="var(--green)"  dim="var(--green-dim)"  onClick={() => navigate('/files')} />
        <StatCard label="Findings"  value={stats?.totalFindings} icon={AlertTriangle} color="var(--accent)" dim="var(--accent-dim)" onClick={() => navigate('/findings')} />
        <StatCard label="Critical"  value={criticalCount}        icon={ShieldAlert}  color="var(--red)"    dim="var(--red-dim)"    onClick={() => navigate('/findings?severity=critical')} />
        <StatCard label="High Risk" value={highCount}            icon={Activity}     color="var(--orange)" dim="var(--orange-dim)" onClick={() => navigate('/findings?severity=high')} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Severity breakdown */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14, padding: 20,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          <div style={{ fontWeight: 600, marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <AlertTriangle size={13} color="var(--text-muted)" /> Findings by Severity
          </div>
          {stats?.bySeverity?.length > 0 ? (
            [...stats.bySeverity]
              .sort((a, b) => ['critical','high','medium','low','info'].indexOf(a.severity) - ['critical','high','medium','low','info'].indexOf(b.severity))
              .map(({ severity, count }) => {
                const pct = Math.round((count / (stats.totalFindings || 1)) * 100);
                return (
                  <div key={severity} style={{ marginBottom: 12, cursor: 'pointer' }}
                    onClick={() => navigate(`/findings?severity=${severity}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'capitalize', color: SEV_COLORS[severity] || 'var(--text-dim)' }}>{severity}</span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: SEV_COLORS[severity] || 'var(--text-muted)',
                        borderRadius: 10, transition: '.4s cubic-bezier(.4,0,.2,1)',
                        boxShadow: `0 0 8px ${SEV_COLORS[severity]}66`,
                      }} />
                    </div>
                  </div>
                );
              })
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              No findings yet — browse your target with the extension active.
            </div>
          )}
        </div>

        {/* Top finding types */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14, padding: 20,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          <div style={{ fontWeight: 600, marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <Activity size={13} color="var(--text-muted)" /> Top Finding Types
          </div>
          {stats?.byType?.length > 0 ? (
            stats.byType.slice(0, 7).map(({ type, label, count }) => (
              <div
                key={type}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                  transition: '.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.paddingLeft = '4px'}
                onMouseLeave={e => e.currentTarget.style.paddingLeft = '0'}
                onClick={() => navigate(`/findings?type=${type}`)}
              >
                <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 400 }}>{label}</span>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  background: 'rgba(255,255,255,0.06)', padding: '2px 8px',
                  borderRadius: 20, color: 'var(--text-dim)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>{count}</span>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No data yet</div>
          )}
        </div>
      </div>

      {/* How to use */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14, padding: '18px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,232,122,0.15), transparent)' }} />
        <div style={{ fontWeight: 600, marginBottom: 14, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={13} color="var(--green)" /> Quick Start
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { step: '01', text: 'This project is now active — the extension will send all captured JS files here.' },
            { step: '02', text: 'Open the extension and set your target scope (e.g. facebook.com) to start capturing.' },
            { step: '03', text: 'Browse normally — files are auto-captured, analyzed, and appear in JS Files.' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                color: 'var(--green)', marginTop: 2, flexShrink: 0,
                background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)',
                padding: '2px 7px', borderRadius: 6, letterSpacing: 0.5,
              }}>{step}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.65 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
