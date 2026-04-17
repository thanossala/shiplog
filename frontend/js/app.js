// ============================================
//  SHIPLOG — Frontend App
// ============================================

const API = 'https://shiplog-tafy.onrender.com';

// ---- State ----
let currentUser = null;
let allLogs = [];
let editingLogId = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('shiplog_token');
  if (token) {
    fetchCurrentUser();
  } else {
    showAuthPage('login');
  }

  bindAuthEvents();
  bindNavEvents();
  bindLogEvents();
});

// ============================================
//  AUTH
// ============================================
function showAuthPage(page) {
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('auth-login').classList.toggle('active', page === 'login');
  document.getElementById('auth-register').classList.toggle('active', page === 'register');
}

function showApp() {
  document.getElementById('auth-login').classList.remove('active');
  document.getElementById('auth-register').classList.remove('active');
  document.getElementById('app-shell').style.display = 'grid';
  navigateTo('dashboard');
}

function bindAuthEvents() {
  // Login form
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Logging in...';

    try {
      const data = await apiPost('/auth/login', { email, password }, false);
      localStorage.setItem('shiplog_token', data.token);
      currentUser = data.user;
      updateUserBadge();
      showApp();
      loadDashboard();
      toast('Welcome back, ' + currentUser.username + '!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Login';
    }
  });

  // Register form
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating account...';
    try {
      const data = await apiPost('/auth/register', {
        username:    document.getElementById('reg-username').value,
        email:       document.getElementById('reg-email').value,
        password:    document.getElementById('reg-password').value,
        vessel_name: document.getElementById('reg-vessel').value,
        rank:        document.getElementById('reg-rank').value,
      }, false);
      localStorage.setItem('shiplog_token', data.token);
      currentUser = data.user;
      updateUserBadge();
      showApp();
      loadDashboard();
      toast('Account created! Welcome aboard, ' + currentUser.username + '.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('shiplog_token');
    currentUser = null;
    showAuthPage('login');
  });

  // Switch auth page links
  document.querySelectorAll('[data-auth-switch]').forEach(el => {
    el.addEventListener('click', () => showAuthPage(el.dataset.authSwitch));
  });
}

async function fetchCurrentUser() {
  try {
    const data = await apiGet('/auth/me');
    currentUser = data.user;
    updateUserBadge();
    showApp();
    loadDashboard();
  } catch {
    localStorage.removeItem('shiplog_token');
    showAuthPage('login');
  }
}

function updateUserBadge() {
  if (!currentUser) return;
  document.getElementById('user-avatar').textContent = currentUser.username[0].toUpperCase();
  document.getElementById('user-name').textContent   = currentUser.username;
  document.getElementById('user-rank').textContent   = currentUser.rank || currentUser.vessel_name || 'CS Student';
}

// ============================================
//  NAVIGATION
// ============================================
function bindNavEvents() {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + page));

  if (page === 'dashboard') loadDashboard();
  if (page === 'logs') loadLogs();
}

// ============================================
//  DASHBOARD
// ============================================
async function loadDashboard() {
  try {
    const data = await apiGet('/logs/stats');
    document.getElementById('stat-total').textContent    = data.total;
    document.getElementById('stat-month').textContent    = data.thisMonth;
    document.getElementById('stat-last').textContent     = data.lastLog ? formatDate(data.lastLog.log_date) : '—';
    document.getElementById('stat-cats').textContent     = data.byCategory.length;
    renderCategoryChart(data.byCategory);
    renderRecentLogs();
  } catch (err) {
    toast('Failed to load dashboard', 'error');
  }
}

function renderCategoryChart(byCategory) {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  // Destroy existing chart if any
  if (window._catChart) window._catChart.destroy();

  const categoryColors = {
    navigation:  '#00d4ff',
    maintenance: '#ffab40',
    safety:      '#ff5252',
    cargo:       '#00e676',
    crew:        '#ce93d8',
    weather:     '#64b5f6',
    other:       '#aaa'
  };

  window._catChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: byCategory.map(c => c.category),
      datasets: [{
        data: byCategory.map(c => c.count),
        backgroundColor: byCategory.map(c => categoryColors[c.category] || '#aaa'),
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#8899aa', font: { family: 'Space Mono', size: 11 }, padding: 12 }
        }
      }
    }
  });
}

async function renderRecentLogs() {
  const container = document.getElementById('recent-logs');
  try {
    const data = await apiGet('/logs?limit=5');
    allLogs = data.logs;
    if (!data.logs.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No logs yet</h3><p>Create your first log entry.</p></div>`;
      return;
    }
    container.innerHTML = data.logs.slice(0, 5).map(renderLogItem).join('');
    attachLogItemEvents(container);
  } catch {
    container.innerHTML = '<p style="color:var(--text-muted)">Failed to load logs.</p>';
  }
}

// ============================================
//  LOGS PAGE
// ============================================
function bindLogEvents() {
  document.getElementById('btn-new-log').addEventListener('click', () => openLogModal());

  // Filter controls
  document.getElementById('filter-category')?.addEventListener('change', loadLogs);
  document.getElementById('filter-search')?.addEventListener('input', debounce(loadLogs, 300));

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeLogModal);
  document.getElementById('modal-cancel').addEventListener('click', closeLogModal);
  document.getElementById('form-log').addEventListener('submit', saveLog);

  // Close modal on overlay click
  document.getElementById('log-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLogModal();
  });
}

async function loadLogs() {
  const category = document.getElementById('filter-category')?.value || '';
  const search   = document.getElementById('filter-search')?.value || '';
  const container = document.getElementById('logs-list');

  let url = '/logs?';
  if (category) url += `category=${category}&`;
  if (search)   url += `search=${encodeURIComponent(search)}&`;

  try {
    const data = await apiGet(url);
    allLogs = data.logs;

    if (!data.logs.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🌊</div><h3>No logs found</h3><p>Try adjusting your filters or create a new log.</p></div>`;
      return;
    }
    container.innerHTML = data.logs.map(renderLogItem).join('');
    attachLogItemEvents(container);
  } catch {
    toast('Failed to load logs', 'error');
  }
}

function renderLogItem(log) {
  return `
    <div class="log-item" data-id="${log.id}">
      <div>
        <div class="log-title">${escHtml(log.title)}</div>
        <div class="log-meta">
          <span class="badge badge-${log.category}">${log.category}</span>
          <span>📅 ${formatDate(log.log_date)}</span>
          ${log.location ? `<span>📍 ${escHtml(log.location)}</span>` : ''}
        </div>
        ${log.description ? `<div style="margin-top:8px;color:var(--text-muted);font-size:12px;">${escHtml(log.description).slice(0,100)}${log.description.length > 100 ? '…' : ''}</div>` : ''}
      </div>
      <div class="log-actions">
        <button class="btn btn-ghost btn-sm" data-edit="${log.id}">✏️</button>
        <button class="btn btn-danger btn-sm" data-delete="${log.id}">🗑</button>
      </div>
    </div>
  `;
}

function attachLogItemEvents(container) {
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openLogModal(btn.dataset.edit); });
  });
  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); deleteLog(btn.dataset.delete); });
  });
}

// ---- Modal ----
function openLogModal(logId = null) {
  editingLogId = logId;
  const modal = document.getElementById('log-modal');
  const title = document.getElementById('modal-title');
  const form  = document.getElementById('form-log');

  form.reset();

  if (logId) {
    const log = allLogs.find(l => l.id == logId);
    if (log) {
      title.textContent = 'Edit Log Entry';
      document.getElementById('log-title').value       = log.title;
      document.getElementById('log-category').value    = log.category;
      document.getElementById('log-date').value        = log.log_date;
      document.getElementById('log-location').value    = log.location || '';
      document.getElementById('log-description').value = log.description || '';
    }
  } else {
    title.textContent = 'New Log Entry';
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
  }

  modal.classList.add('open');
}

function closeLogModal() {
  document.getElementById('log-modal').classList.remove('open');
  editingLogId = null;
}

async function saveLog(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const payload = {
    title:       document.getElementById('log-title').value,
    category:    document.getElementById('log-category').value,
    log_date:    document.getElementById('log-date').value,
    location:    document.getElementById('log-location').value,
    description: document.getElementById('log-description').value,
  };

  try {
    if (editingLogId) {
      await apiPut('/logs/' + editingLogId, payload);
      toast('Log updated.', 'success');
    } else {
      await apiPost('/logs', payload);
      toast('Log created.', 'success');
    }
    closeLogModal();
    loadLogs();
    loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Entry';
  }
}

async function deleteLog(id) {
  if (!confirm('Delete this log entry?')) return;
  try {
    await apiDelete('/logs/' + id);
    toast('Log deleted.', 'info');
    loadLogs();
    loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ============================================
//  API HELPERS
// ============================================
function getToken() { return localStorage.getItem('shiplog_token'); }

async function apiGet(path) {
  const res = await fetch(API + path, {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiPost(path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = 'Bearer ' + getToken();
  const res = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(API + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiDelete(path) {
  const res = await fetch(API + path, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ============================================
//  UTILS
// ============================================
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
