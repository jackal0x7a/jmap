import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { FileCode, AlertTriangle, LayoutDashboard, ChevronDown, Plus, Trash2, Check, X, ShieldAlert, Globe } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import FilesPage from './pages/FilesPage.jsx';
import FileDetail from './pages/FileDetail.jsx';
import FindingsPage from './pages/FindingsPage.jsx';
import EndpointsPage from './pages/EndpointsPage.jsx';
import { api } from './api/client.js';

// ─── Glass Modal ──────────────────────────────────────────────────────────────

function GlassModal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  // Portal renders directly into <body>, escaping sidebar stacking context + overflow clipping
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      {/* Separate blur/dim layer — clicking this closes the modal */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(6,8,16,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />
      {/* Modal card sits above the blur layer, unaffected by its stacking context */}
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
        {/* Shine strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: 'var(--text-dim)', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: '.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px' }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '0 22px 20px',
            display: 'flex', gap: 8, justifyContent: 'flex-end',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}


// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ open, projectName, onConfirm, onCancel }) {
  return (
    <GlassModal
      open={open}
      onClose={onCancel}
      title="Delete Project"
      footer={
        <>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 500,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text)', transition: '.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.35)',
              color: 'var(--red)', transition: '.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-dim)'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={13} /> Delete</span>
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <ShieldAlert size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--red)', fontSize: 13 }}>This action cannot be undone</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 3 }}>All captured JS files and findings in this project will be permanently removed.</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text)' }}>
          Delete project <strong style={{ color: '#fff' }}>"{projectName}"</strong>?
        </p>
      </div>
    </GlassModal>
  );
}

// ─── Scope Warning Banner ─────────────────────────────────────────────────────

function ScopeWarningBanner({ activeProject, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (activeProject) {
      setDismissed(false);
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [activeProject?.id]);

  if (!visible || dismissed || !activeProject) return null;

  // Also rendered via portal so fixed positioning is never affected by a parent transform
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 900,
      width: 340,
      background: 'rgba(15,19,32,0.82)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(251,191,36,0.3)',
      borderRadius: 14,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,191,36,0.08)',
      animation: 'fadeIn 0.3s ease, warnPulse 2s ease 0.5s',
    }}>
      {/* Top shine */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)',
        borderRadius: '14px 14px 0 0',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'var(--yellow-dim)', border: '1px solid rgba(251,191,36,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={15} color="var(--yellow)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 3 }}>
            No scope set — nothing will be captured
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Project <strong style={{ color: 'var(--yellow)' }}>{activeProject.name}</strong> is active. Open the extension and add a domain like{' '}
            <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>
              example.com
            </code>{' '}to start capturing.
          </div>
          <button
            onClick={() => { setDismissed(true); setVisible(false); }}
            style={{
              marginTop: 10, padding: '5px 12px', fontSize: 11, fontWeight: 600,
              background: 'var(--yellow-dim)', border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 7, color: 'var(--yellow)', transition: '.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--yellow-dim)'}
          >
            Got it
          </button>
        </div>
        <button
          onClick={() => { setDismissed(true); setVisible(false); }}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            padding: 2, display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={13} />
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Project Switcher ─────────────────────────────────────────────────────────

function ProjectSwitcher({ projects, activeProject, onSwitch, onCreate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = async () => {
    const name = newName.trim();
    if (!name) return;
    await onCreate(name);
    setNewName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <>
      {/* Modal is now a sibling rendered via portal — no longer trapped inside the sidebar DOM */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        projectName={deleteTarget?.name || ''}
        onConfirm={async () => { await onDelete(deleteTarget.id); setDeleteTarget(null); setOpen(false); }}
        onCancel={() => setDeleteTarget(null)}
      />

      <div style={{ padding: '10px 10px 0', marginBottom: 4, position: 'relative' }} ref={ref}>
        {/* Trigger */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${open ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 10, padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', transition: '.15s', color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: activeProject ? 'var(--green)' : 'rgba(255,255,255,0.15)',
              flexShrink: 0,
              animation: activeProject ? 'pulse 2s infinite' : 'none',
              boxShadow: activeProject ? '0 0 8px var(--green-glow)' : 'none',
            }} />
            {activeProject
              ? <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProject.name}</span>
              : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No active project</span>
            }
          </div>
          <ChevronDown size={13} color="var(--text-dim)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.2s', flexShrink: 0 }} />
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 10, right: 10,
            background: 'transparent',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.13)',
            borderRadius: 12, zIndex: 100,
            // No overflow:hidden here — it clips the input+button row at the bottom
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
            animation: 'slideDown 0.15s ease',
            paddingBottom: 4,
          }}>
            {projects.length > 0 && (
              <div style={{ overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 11px', cursor: 'pointer', fontSize: 13,
                      background: p.is_active ? 'rgba(0,232,122,0.08)' : 'transparent',
                      color: p.is_active ? 'var(--green)' : 'var(--text)',
                      transition: '.1s',
                    }}
                    onMouseEnter={e => { if (!p.is_active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (!p.is_active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}
                      onClick={() => { onSwitch(p.id); setOpen(false); }}
                    >
                      <Check size={12} style={{ opacity: p.is_active ? 1 : 0, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                        {p.file_count} files
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        cursor: 'pointer', padding: '2px 4px', marginLeft: 6, borderRadius: 4,
                        display: 'flex', alignItems: 'center', transition: '.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
              </div>
            )}

            {creating ? (
              <div style={{ padding: '8px 11px', display: 'flex', gap: 6, alignItems: 'center', background: 'transparent' }}>
                <input
                  autoFocus
                  placeholder="Project name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                  style={{
                    flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 7, color: '#fff', padding: '5px 9px', fontSize: 12,
                    fontFamily: 'var(--font-sans)', outline: 'none',
                  }}
                />
                <button
                  onClick={submit}
                  style={{
                    background: 'var(--green)', color: '#000', border: 'none', borderRadius: 7,
                    padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  Create
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{
                  width: '100%', background: 'none', border: 'none', color: 'var(--text-dim)',
                  padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                  transition: '.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                <Plus size={12} /> New Project
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ stats, projects, activeProject, onSwitch, onCreate, onDelete }) {
  const nav = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
    { to: '/files', label: 'JS Files', icon: FileCode, badge: stats?.totalFiles },
    { to: '/findings', label: 'Findings', icon: AlertTriangle, badge: stats?.totalFindings },
    { to: '/endpoints', label: 'Endpoints', icon: Globe, badge: stats?.totalEndpoints },
  ];

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      // ↓ No backdropFilter here — any element with backdrop-filter creates a
      //   new containing block for position:fixed children (browser spec), which
      //   traps portaled modals inside the sidebar visually. Use a solid bg instead.
      background: '#0a0d14',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{
        padding: '16px 14px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 38, height: 38, flexShrink: 0,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/logo.png" alt="J-MAP" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: 1 }}>
            J-<span style={{ color: 'var(--green)' }}>MAP</span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>By jackal</div>
        </div>
      </div>

      {/* Project switcher */}
      <ProjectSwitcher
        projects={projects}
        activeProject={activeProject}
        onSwitch={onSwitch}
        onCreate={onCreate}
        onDelete={onDelete}
      />

      {/* Nav */}
      <nav style={{ padding: '6px 8px', flex: 1 }}>
        {nav.map(({ to, label, icon: Icon, badge, exact }) => (
          <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, padding: '8px 11px', borderRadius: 9, marginBottom: 2,
            color: isActive ? '#fff' : 'var(--text-dim)',
            background: isActive ? 'rgba(0,232,122,0.1)' : 'transparent',
            border: `1px solid ${isActive ? 'rgba(0,232,122,0.2)' : 'transparent'}`,
            backdropFilter: isActive ? 'blur(8px)' : 'none',
            transition: '.15s', fontWeight: isActive ? 600 : 400, fontSize: 13,
            boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
          })}>
            {({ isActive }) => (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={15} color={isActive ? 'var(--green)' : 'currentColor'} />
                  {label}
                </div>
                {badge > 0 && (
                  <span style={{
                    background: 'rgba(255,255,255,0.07)',
                    color: 'var(--text-dim)', fontSize: 10,
                    fontFamily: 'var(--font-mono)', padding: '1px 7px', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>{badge}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      <div style={{
        padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: stats !== null ? 'var(--green)' : 'var(--red)',
          animation: stats ? 'pulse 2s infinite' : 'none',
          boxShadow: stats !== null ? '0 0 8px var(--green-glow)' : '0 0 6px rgba(244,63,94,0.4)',
        }} />
        {stats !== null ? 'Backend Online' : 'Backend Offline'}
      </div>
    </aside>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function AppInner() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [showScopeWarning, setShowScopeWarning] = useState(false);
  const prevProjectId = useRef(null);
  const location = useLocation();

  const loadProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
      setActiveProject(list.find(p => p.is_active) || null);
    } catch {}
  };

  const loadStats = async () => {
    try { setStats(await api.getStats()); }
    catch { setStats(null); }
  };

  useEffect(() => {
    loadProjects();
    loadStats();
    const iv = setInterval(() => { loadProjects(); loadStats(); }, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { loadStats(); }, [location.pathname, activeProject?.id]);

  useEffect(() => {
    if (activeProject && activeProject.id !== prevProjectId.current) {
      if (prevProjectId.current !== null) {
        setShowScopeWarning(true);
      } else if (activeProject.file_count === 0) {
        setShowScopeWarning(true);
      }
      prevProjectId.current = activeProject.id;
    }
    if (!activeProject) {
      prevProjectId.current = null;
      setShowScopeWarning(false);
    }
  }, [activeProject?.id]);

  const handleSwitch = async (id) => {
    await api.activateProject(id);
    await loadProjects();
    await loadStats();
    setShowScopeWarning(true);
  };

  const handleCreate = async (name) => {
    await api.createProject(name);
    await loadProjects();
    await loadStats();
    setShowScopeWarning(true);
  };

  const handleDelete = async (id) => {
    await api.deleteProject(id);
    await loadProjects();
    await loadStats();
  };

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          stats={stats}
          projects={projects}
          activeProject={activeProject}
          onSwitch={handleSwitch}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
        <main style={{
          flex: 1, overflow: 'auto',
          background: 'transparent',
          // No animation here — CSS animations that use transform create a stacking
          // context which would trap portaled modals/banners inside this element
        }}>
          <Routes>
            <Route path="/" element={<Dashboard stats={stats} activeProject={activeProject} onRefresh={loadStats} />} />
            <Route path="/files" element={<FilesPage onRefresh={loadStats} />} />
            <Route path="/files/:id" element={<FileDetail />} />
            <Route path="/findings" element={<FindingsPage />} />
            <Route path="/endpoints" element={<EndpointsPage onRefresh={loadStats} />} />
          </Routes>
        </main>
      </div>

      {/* ScopeWarningBanner is outside the flex container so fixed positioning
          is never affected by a parent transform or overflow:hidden */}
      {showScopeWarning && (
        <ScopeWarningBanner
          activeProject={activeProject}
          onDismiss={() => setShowScopeWarning(false)}
        />
      )}
    </>
  );
}

export default function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>;
}