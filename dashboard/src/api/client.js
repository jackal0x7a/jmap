const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  // Projects
  getProjects:      ()      => req('/projects'),
  createProject:    (name)  => req('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  activateProject:  (id)    => req(`/projects/${id}/activate`, { method: 'POST' }),
  deleteProject:    (id)    => req(`/projects/${id}`, { method: 'DELETE' }),
  getActiveProject: ()      => req('/projects/active'),

  // Stats
  getStats: () => req('/stats'),

  // Files
  getFiles: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
    return req(`/js-files${q.toString() ? '?' + q : ''}`);
  },
  getFile:        (id) => req(`/js-files/${id}`),
  getFileFinding: (id) => req(`/js-files/${id}/findings`),
  analyzeFile:    (id) => req(`/js-files/${id}/analyze`, { method: 'POST' }),
  deleteFile:     (id) => req(`/js-files/${id}`, { method: 'DELETE' }),

  // Findings
  getFindings: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
    return req(`/findings${q.toString() ? '?' + q : ''}`);
  },

  // Endpoints (from JS static analysis)
  getEndpoints: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
    return req(`/endpoints${q.toString() ? '?' + q : ''}`);
  },

  // Observed requests (live browser traffic)
  getObservedRequests: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
    return req(`/observed-requests${q.toString() ? '?' + q : ''}`);
  },
  clearObservedRequests: () => req('/observed-requests', { method: 'DELETE' }),
};
