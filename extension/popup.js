// J-MAP Popup

let scope = [];
let enabled = true;
let isLoading = true;

async function load() {
  try {
    const status = await Promise.race([
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);

    scope = status.config?.scope || [];
    enabled = status.config?.enabled !== false;

    document.getElementById('enableToggle').checked = enabled;

    const project = status.activeProject;
    const dot = document.getElementById('projectDot');
    const name = document.getElementById('projectName');
    const hint = document.getElementById('projectHint');

    if (project && project.id) {
      dot.className = 'project-dot active';
      name.className = 'project-name';
      name.textContent = project.name;
      hint.textContent = 'capturing →';
    } else {
      dot.className = 'project-dot';
      name.className = 'project-name none';
      name.textContent = 'No active project';
      hint.textContent = 'open dashboard to create one';
    }

    const count = status.pending || 0;
    const el = document.getElementById('pendingCount');
    el.textContent = count;
    el.className = 'pending-count' + (count === 0 ? ' zero' : '');

    document.getElementById('loadingView').style.display = 'none';
    document.getElementById('mainView').style.display = 'block';
    isLoading = false;

    renderTags();
    updateScopeWarning();
  } catch (err) {
    console.warn('[J-MAP popup] load error:', err.message);
    document.getElementById('loadingView').style.display = 'none';
    document.getElementById('mainView').style.display = 'block';

    const name = document.getElementById('projectName');
    name.textContent = 'Backend offline';
    name.className = 'project-name none';
    document.getElementById('projectHint').textContent = 'start server to capture';
    document.getElementById('pendingCount').textContent = '?';
    isLoading = false;
    renderTags();
    updateScopeWarning();
  }
}

function updateScopeWarning() {
  const warning = document.getElementById('scopeWarning');
  if (scope.length === 0) {
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }
}

function renderTags() {
  const container = document.getElementById('scopeTags');
  if (!scope.length) {
    container.innerHTML = '<span class="empty">No scope — nothing will be captured</span>';
    return;
  }
  container.innerHTML = scope.map(s => `
    <div class="tag">
      ${esc(s)}
      <span class="tag-x" data-s="${esc(s)}">×</span>
    </div>
  `).join('');
  container.querySelectorAll('.tag-x').forEach(el =>
    el.addEventListener('click', () => removeScope(el.dataset.s))
  );
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function save() {
  try {
    await chrome.runtime.sendMessage({ type: 'SET_CONFIG', scope, enabled });
  } catch {}
}

function addScope() {
  const input = document.getElementById('scopeInput');
  const val = input.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!val || scope.includes(val)) { input.value = ''; return; }
  scope.push(val);
  input.value = '';
  renderTags();
  updateScopeWarning();
  save();
}

function removeScope(val) {
  scope = scope.filter(s => s !== val);
  renderTags();
  updateScopeWarning();
  save();
}

document.getElementById('addBtn').addEventListener('click', addScope);
document.getElementById('scopeInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addScope();
});

document.getElementById('enableToggle').addEventListener('change', e => {
  enabled = e.target.checked;
  save();
});

document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  btn.textContent = '⟳ Flushing…';
  btn.disabled = true;
  try {
    await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
    await new Promise(r => setTimeout(r, 1500));
    await load();
  } catch {}
  btn.textContent = '⟳ Flush';
  btn.disabled = false;
});

load();
setInterval(() => { if (!isLoading) load(); }, 4000);
