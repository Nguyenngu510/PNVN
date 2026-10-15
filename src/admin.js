/**
 * Admin Dashboard Logic – Thiệp 20/10
 * Quản trị truy cập, người dùng, thiệp gửi & biểu đồ thống kê
 */
import { API_BASE } from './config.js';

// Global application state
const state = {
  adminKey: sessionStorage.getItem('admin_key') || localStorage.getItem('admin_key') || '',
  activePage: 'dashboard',
  chartDays: {
    otp: 7,
    cards: 7,
    students: 7
  },
  users: {
    page: 1,
    pageSize: 15,
    search: '',
    total: 0,
    list: []
  },
  cards: {
    page: 1,
    pageSize: 15,
    search: '',
    total: 0,
    list: []
  },
  selectedCard: null,
  pendingDeleteAction: null // { type: 'user'|'card', id: string, name: string }
};

// Chart instances registry
const charts = {
  otp: null,
  cards: null,
  students: null,
  gender: null
};

// ─── API HELPER ─────────────────────────────────────────────────────────────
async function adminFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Key': state.adminKey,
    ...(options.headers || {})
  };

  const resp = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (resp.status === 401) {
    // Key không hợp lệ hoặc đã hết hạn
    showLoginOverlay(true);
    throw new Error('Khóa quản trị (Admin Key) không hợp lệ!');
  }

  if (!resp.ok) {
    let msg = `Lỗi yêu cầu (${resp.status})`;
    try {
      const err = await resp.json();
      if (err && err.message) msg = err.message;
    } catch {
      const txt = await resp.text();
      if (txt) msg = txt;
    }
    throw new Error(msg);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  clearTimeout(toastTimer);
  toast.className = `toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  toast.style.display = 'flex';

  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

// ─── AUTHENTICATION FLOW ────────────────────────────────────────────────────
function showLoginOverlay(showError = false) {
  const overlay = document.getElementById('login-overlay');
  const app = document.getElementById('app');
  const errBox = document.getElementById('login-error');

  if (overlay) overlay.style.display = 'flex';
  if (app) app.style.display = 'none';
  if (errBox) errBox.style.display = showError ? 'block' : 'none';
}

function hideLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  const app = document.getElementById('app');
  const errBox = document.getElementById('login-error');

  if (overlay) overlay.style.display = 'none';
  if (app) app.style.display = 'block';
  if (errBox) errBox.style.display = 'none';
}

async function handleLogin() {
  const input = document.getElementById('admin-key-input');
  const errBox = document.getElementById('login-error');
  const key = input ? input.value.trim() : '';

  if (!key) {
    if (errBox) {
      errBox.textContent = 'Vui lòng nhập Admin Key.';
      errBox.style.display = 'block';
    }
    return;
  }

  try {
    state.adminKey = key;
    // Thử gọi /api/admin/stats để xác thực key
    const stats = await adminFetch('/admin/stats');
    
    // Lưu key vào sessionStorage
    sessionStorage.setItem('admin_key', key);
    localStorage.setItem('admin_key', key);

    hideLoginOverlay();
    renderStats(stats);
    loadAllCharts();
    showToast('Đăng nhập quản trị thành công!', 'success');
  } catch (err) {
    state.adminKey = '';
    sessionStorage.removeItem('admin_key');
    if (errBox) {
      errBox.textContent = err.message || 'Key không chính xác.';
      errBox.style.display = 'block';
    }
  }
}

function handleLogout() {
  state.adminKey = '';
  sessionStorage.removeItem('admin_key');
  localStorage.removeItem('admin_key');
  const input = document.getElementById('admin-key-input');
  if (input) input.value = '';
  showLoginOverlay(false);
  showToast('Đã đăng xuất khỏi hệ thống quản trị', 'info');
}

// ─── DASHBOARD STATS & METRICS ──────────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const btnRefresh = document.getElementById('btn-refresh-stats');
    if (btnRefresh) btnRefresh.style.opacity = '0.6';

    const stats = await adminFetch('/admin/stats');
    renderStats(stats);

    const updatedEl = document.getElementById('last-updated');
    if (updatedEl) {
      const now = new Date();
      updatedEl.textContent = `Cập nhật lúc ${now.toLocaleTimeString('vi-VN')} – ${now.toLocaleDateString('vi-VN')}`;
    }

    if (btnRefresh) btnRefresh.style.opacity = '1';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStats(stats) {
  if (!stats) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof val === 'number' ? val.toLocaleString('vi-VN') : val;
  };

  setVal('stat-users', stats.totalStudents ?? 0);
  setVal('stat-male', stats.totalMale ?? 0);
  setVal('stat-female', stats.totalFemale ?? 0);
  setVal('stat-cards', stats.totalCards ?? 0);
  setVal('stat-seen', stats.totalSeen ?? 0);
  setVal('stat-unseen', stats.totalUnseen ?? 0);
  setVal('stat-otp', stats.otpToday ?? 0);

  // Tính tỷ lệ mở thiệp
  const totalCards = stats.totalCards ?? 0;
  const totalSeen = stats.totalSeen ?? 0;
  const openRate = totalCards > 0 ? Math.round((totalSeen / totalCards) * 100) : 0;
  const rateEl = document.getElementById('stat-open-rate');
  if (rateEl) rateEl.textContent = `${openRate}%`;

  // Render doughnut chart cho giới tính
  renderGenderChart(stats.totalMale ?? 0, stats.totalFemale ?? 0);
}

// ─── CHART.JS RENDERING ─────────────────────────────────────────────────────
const CHART_COMMON_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      titleFont: { family: 'Inter', size: 12, weight: 'bold' },
      bodyFont: { family: 'Inter', size: 12 },
      padding: 10,
      boxPadding: 4,
      usePointStyle: true
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.04)' },
      ticks: {
        color: '#64748b',
        font: { family: 'Inter', size: 11 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 7
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: {
        color: '#64748b',
        font: { family: 'Inter', size: 11 },
        precision: 0
      }
    }
  }
};

function formatChartDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

// 1. Biểu đồ lượt truy cập (OTP requests)
async function loadOtpChart(days = state.chartDays.otp) {
  try {
    state.chartDays.otp = days;
    const data = await adminFetch(`/admin/chart/otp?days=${days}`);
    const ctx = document.getElementById('chartOtp')?.getContext('2d');
    if (!ctx) return;

    if (charts.otp) charts.otp.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

    charts.otp = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => formatChartDate(d.date)),
        datasets: [{
          label: 'Lượt xác thực OTP',
          data: data.map(d => d.count),
          borderColor: '#0ea5e9',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#0ea5e9',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: days <= 14 ? 3.5 : 2,
          pointHoverRadius: 6
        }]
      },
      options: CHART_COMMON_OPTIONS
    });
  } catch (err) {
    console.error('Lỗi tải chart OTP:', err);
  }
}

// 2. Biểu đồ lượng thiệp gửi
async function loadCardsChart(days = state.chartDays.cards) {
  try {
    state.chartDays.cards = days;
    const data = await adminFetch(`/admin/chart/cards?days=${days}`);
    const ctx = document.getElementById('chartCards')?.getContext('2d');
    if (!ctx) return;

    if (charts.cards) charts.cards.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
    gradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

    charts.cards = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => formatChartDate(d.date)),
        datasets: [{
          label: 'Thiệp đã gửi',
          data: data.map(d => d.count),
          borderColor: '#f43f5e',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#f43f5e',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: days <= 14 ? 3.5 : 2,
          pointHoverRadius: 6
        }]
      },
      options: CHART_COMMON_OPTIONS
    });
  } catch (err) {
    console.error('Lỗi tải chart Cards:', err);
  }
}

// 3. Biểu đồ sinh viên đăng ký mới
async function loadStudentsChart(days = state.chartDays.students) {
  try {
    state.chartDays.students = days;
    const data = await adminFetch(`/admin/chart/students?days=${days}`);
    const ctx = document.getElementById('chartStudents')?.getContext('2d');
    if (!ctx) return;

    if (charts.students) charts.students.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    charts.students = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => formatChartDate(d.date)),
        datasets: [{
          label: 'Đăng ký mới',
          data: data.map(d => d.count),
          borderColor: '#8b5cf6',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: days <= 14 ? 3.5 : 2,
          pointHoverRadius: 6
        }]
      },
      options: CHART_COMMON_OPTIONS
    });
  } catch (err) {
    console.error('Lỗi tải chart Students:', err);
  }
}

// 4. Biểu đồ tỷ lệ giới tính (Doughnut)
function renderGenderChart(maleCount, femaleCount) {
  const ctx = document.getElementById('chartGender')?.getContext('2d');
  if (!ctx) return;

  if (charts.gender) charts.gender.destroy();

  const total = maleCount + femaleCount;
  const malePercent = total > 0 ? Math.round((maleCount / total) * 100) : 0;
  const femalePercent = total > 0 ? 100 - malePercent : 0;

  charts.gender = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [`Nữ (${femaleCount} - ${femalePercent}%)`, `Nam (${maleCount} - ${malePercent}%)`],
      datasets: [{
        data: [femaleCount, maleCount],
        backgroundColor: ['#f43f5e', '#0ea5e9'],
        borderColor: '#111827',
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 12 },
            padding: 18,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          titleFont: { family: 'Inter', size: 12, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 10
        }
      }
    }
  });
}

function loadAllCharts() {
  loadOtpChart();
  loadCardsChart();
  loadStudentsChart();
}

// ─── USERS MANAGEMENT ───────────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 36px; color: var(--text-dim);">Đang tải dữ liệu người dùng...</td></tr>`;
  }

  try {
    const res = await adminFetch(`/admin/users?page=${state.users.page}&pageSize=${state.users.pageSize}&search=${encodeURIComponent(state.users.search)}`);
    state.users.total = res.total;
    state.users.list = res.users;

    const countBadge = document.getElementById('users-count-badge');
    if (countBadge) countBadge.textContent = `${res.total.toLocaleString('vi-VN')} sinh viên`;

    renderUsersTable(res.users);
    renderPagination(
      'users',
      res.page,
      res.pageSize,
      res.total,
      (newPage) => {
        state.users.page = newPage;
        loadUsers();
      }
    );
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 36px; color: #ef4444;">Không thể tải danh sách: ${err.message}</td></tr>`;
    }
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 48px; color: var(--text-dim);">Không tìm thấy sinh viên nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isFemale = (u.gender || '').toLowerCase().includes('nữ') || (u.gender || '').toLowerCase().includes('female');
    const genderBadge = isFemale
      ? `<span class="badge-gender badge-female">🌸 Nữ</span>`
      : `<span class="badge-gender badge-male">⚡ Nam</span>`;

    const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '-';

    return `
      <tr>
        <td><span class="mono-code">${escapeHtml(u.studentCode)}</span></td>
        <td><strong>${escapeHtml(u.fullName)}</strong></td>
        <td>${escapeHtml(u.class || '-')}</td>
        <td>${genderBadge}</td>
        <td><span style="font-family:'JetBrains Mono', monospace; font-size:0.8rem;">${escapeHtml(u.email || '-')}</span></td>
        <td><span style="font-weight:700; color:var(--accent-rose);">${u.cardsSent ?? 0}</span></td>
        <td><span style="font-weight:700; color:var(--accent-purple);">${u.cardsReceived ?? 0}</span></td>
        <td style="font-size:0.8rem; color:var(--text-dim);">${createdAt}</td>
        <td>
          <button class="btn-table-action btn-del-action" data-action="delete-user" data-id="${u.studentId}" data-name="${escapeHtml(u.fullName)}">
            Xóa
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach delete handlers
  tbody.querySelectorAll('[data-action="delete-user"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      promptConfirmDelete('user', id, `sinh viên "${name}"`);
    });
  });
}

// ─── CARDS MANAGEMENT ───────────────────────────────────────────────────────
async function loadCards() {
  const tbody = document.getElementById('cards-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 36px; color: var(--text-dim);">Đang tải dữ liệu thiệp...</td></tr>`;
  }

  try {
    const res = await adminFetch(`/admin/cards?page=${state.cards.page}&pageSize=${state.cards.pageSize}&search=${encodeURIComponent(state.cards.search)}`);
    state.cards.total = res.total;
    state.cards.list = res.cards;

    const countBadge = document.getElementById('cards-count-badge');
    if (countBadge) countBadge.textContent = `${res.total.toLocaleString('vi-VN')} thiệp`;

    renderCardsTable(res.cards);
    renderPagination(
      'cards',
      res.page,
      res.pageSize,
      res.total,
      (newPage) => {
        state.cards.page = newPage;
        loadCards();
      }
    );
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 36px; color: #ef4444;">Không thể tải danh sách thiệp: ${err.message}</td></tr>`;
    }
  }
}

function renderCardsTable(cards) {
  const tbody = document.getElementById('cards-tbody');
  if (!tbody) return;

  if (!cards || cards.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 48px; color: var(--text-dim);">Không có thiệp nào phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = cards.map(c => {
    const statusBadge = c.isSeen
      ? `<span class="badge-seen">✓ Đã mở xem</span>`
      : `<span class="badge-unseen">⏳ Chưa mở</span>`;

    const createdAt = c.createdAt ? new Date(c.createdAt).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '-';

    return `
      <tr>
        <td>
          <div style="font-weight:600; color:#fff;">${escapeHtml(c.title || '(Không có tiêu đề)')}</div>
        </td>
        <td>
          <div>${escapeHtml(c.senderName || 'Ẩn danh')}</div>
          <small class="mono-code">${escapeHtml(c.senderCode || '-')}</small>
        </td>
        <td>
          <div>${escapeHtml(c.recipientName || 'Ẩn danh')}</div>
          <small class="mono-code">${escapeHtml(c.recipientCode || '-')}</small>
        </td>
        <td>${statusBadge}</td>
        <td style="font-size:0.8rem; color:var(--text-dim);">${createdAt}</td>
        <td>
          <div class="action-btn-group">
            <button class="btn-table-action btn-view-card" data-action="view-card" data-id="${c.cardId}">
              Chi tiết
            </button>
            <button class="btn-table-action btn-del-action" data-action="delete-card" data-id="${c.cardId}" data-title="${escapeHtml(c.title)}">
              Xóa
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach view & delete handlers
  tbody.querySelectorAll('[data-action="view-card"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const card = state.cards.list.find(item => item.cardId === id);
      if (card) openCardModal(card);
    });
  });

  tbody.querySelectorAll('[data-action="delete-card"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');
      promptConfirmDelete('card', id, `thiệp "${title}"`);
    });
  });
}

// ─── CARD DETAIL MODAL ──────────────────────────────────────────────────────
function openCardModal(card) {
  state.selectedCard = card;
  const modal = document.getElementById('modal-view-card');
  if (!modal) return;

  const senderEl = document.getElementById('modal-sender');
  const recipientEl = document.getElementById('modal-recipient');
  const titleEl = document.getElementById('modal-title');
  const messageEl = document.getElementById('modal-message');
  const imgEl = document.getElementById('modal-card-img');
  const statusEl = document.getElementById('modal-status-text');

  if (senderEl) senderEl.textContent = `${card.senderName} (${card.senderCode || '-'})`;
  if (recipientEl) recipientEl.textContent = `${card.recipientName} (${card.recipientCode || '-'})`;
  if (titleEl) titleEl.textContent = card.title || 'Thiệp 20/10';
  if (messageEl) messageEl.innerHTML = card.message || '(Không có nội dung tin nhắn)';

  if (imgEl) {
    if (card.imageUrl) {
      imgEl.src = card.imageUrl;
      imgEl.style.display = 'block';
    } else {
      imgEl.src = '';
      imgEl.style.display = 'none';
    }
  }

  if (statusEl) {
    const createdStr = card.createdAt ? new Date(card.createdAt).toLocaleString('vi-VN') : '';
    const seenStr = card.seenAt ? ` &bull; Đã mở xem lúc: ${new Date(card.seenAt).toLocaleString('vi-VN')}` : ' &bull; Người nhận chưa mở thiệp';
    statusEl.innerHTML = `Gửi lúc: ${createdStr}${seenStr}`;
  }

  modal.classList.add('show');
}

function closeCardModal() {
  const modal = document.getElementById('modal-view-card');
  if (modal) modal.classList.remove('show');
  state.selectedCard = null;
}

// ─── CONFIRM DELETE MODAL ───────────────────────────────────────────────────
function promptConfirmDelete(type, id, displayName) {
  state.pendingDeleteAction = { type, id, displayName };
  const modal = document.getElementById('modal-confirm');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');

  if (titleEl) {
    titleEl.textContent = type === 'user' ? 'Xác nhận xóa Người dùng' : 'Xác nhận xóa Thiệp';
  }
  if (msgEl) {
    msgEl.innerHTML = `Bạn có chắc chắn muốn xóa <strong>${escapeHtml(displayName)}</strong> không?<br><span style="color:#ef4444; font-size:0.86rem;">Lưu ý: Hành động này sẽ xóa vĩnh viễn khỏi cơ sở dữ liệu và không thể hoàn tác!</span>`;
  }
  if (modal) modal.classList.add('show');
}

function closeConfirmModal() {
  const modal = document.getElementById('modal-confirm');
  if (modal) modal.classList.remove('show');
  state.pendingDeleteAction = null;
}

async function executeConfirmDelete() {
  if (!state.pendingDeleteAction) return;
  const { type, id, displayName } = state.pendingDeleteAction;

  try {
    if (type === 'user') {
      await adminFetch(`/admin/users/${id}`, { method: 'DELETE' });
      showToast(`Đã xóa sinh viên thành công`, 'success');
      closeConfirmModal();
      loadUsers();
      loadDashboardStats();
    } else if (type === 'card') {
      await adminFetch(`/admin/cards/${id}`, { method: 'DELETE' });
      showToast(`Đã xóa thiệp thành công`, 'success');
      closeConfirmModal();
      closeCardModal();
      loadCards();
      loadDashboardStats();
    }
  } catch (err) {
    showToast(`Xóa thất bại: ${err.message}`, 'error');
  }
}

// ─── PAGINATION COMPONENT ───────────────────────────────────────────────────
function renderPagination(type, currentPage, pageSize, totalItems, onPageChange) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const infoEl = document.getElementById(`${type}-pagination-info`);
  const controlsEl = document.getElementById(`${type}-pagination-controls`);

  if (infoEl) {
    const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);
    infoEl.textContent = `Hiển thị ${start} - ${end} trên ${totalItems.toLocaleString('vi-VN')} mục (Trang ${currentPage}/${totalPages})`;
  }

  if (!controlsEl) return;
  controlsEl.innerHTML = '';

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-nav-btn';
  prevBtn.textContent = 'Trước';
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
  controlsEl.appendChild(prevBtn);

  // Page Numbers
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    const pBtn = document.createElement('button');
    pBtn.className = `page-nav-btn ${p === currentPage ? 'active' : ''}`;
    pBtn.textContent = p;
    pBtn.addEventListener('click', () => onPageChange(p));
    controlsEl.appendChild(pBtn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-nav-btn';
  nextBtn.textContent = 'Sau';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
  controlsEl.appendChild(nextBtn);
}

// ─── TAB NAVIGATION ─────────────────────────────────────────────────────────
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.getAttribute('data-page');
      if (!pageId) return;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      pages.forEach(p => {
        if (p.id === `page-${pageId}`) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });

      state.activePage = pageId;

      // Lazy load tab data
      if (pageId === 'users' && state.users.list.length === 0) {
        loadUsers();
      } else if (pageId === 'cards' && state.cards.list.length === 0) {
        loadCards();
      }
    });
  });
}

// ─── UTILITIES ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ─── EVENT LISTENERS INITIALIZATION ─────────────────────────────────────────
function setupEvents() {
  // Login events
  const btnLogin = document.getElementById('btn-admin-login');
  const keyInput = document.getElementById('admin-key-input');
  const btnTogglePwd = document.getElementById('btn-toggle-pwd');

  if (btnLogin) btnLogin.addEventListener('click', handleLogin);
  if (keyInput) {
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  if (btnTogglePwd && keyInput) {
    btnTogglePwd.addEventListener('click', () => {
      const isPwd = keyInput.type === 'password';
      keyInput.type = isPwd ? 'text' : 'password';
    });
  }

  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);

  // Refresh Stats
  const btnRefresh = document.getElementById('btn-refresh-stats');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadDashboardStats();
      loadAllCharts();
      showToast('Đã làm mới dữ liệu thống kê', 'info');
    });
  }

  // Period buttons for charts
  const setupPeriodButtons = (containerId, loadFn) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const btns = container.querySelectorAll('.period-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const days = parseInt(btn.getAttribute('data-days'), 10) || 7;
        loadFn(days);
      });
    });
  };

  setupPeriodButtons('otp-period-btns', loadOtpChart);
  setupPeriodButtons('cards-period-btns', loadCardsChart);
  setupPeriodButtons('students-period-btns', loadStudentsChart);

  // Search inputs
  const userSearch = document.getElementById('users-search');
  if (userSearch) {
    userSearch.addEventListener('input', debounce((e) => {
      state.users.search = e.target.value.trim();
      state.users.page = 1;
      loadUsers();
    }, 350));
  }

  const cardSearch = document.getElementById('cards-search');
  if (cardSearch) {
    cardSearch.addEventListener('input', debounce((e) => {
      state.cards.search = e.target.value.trim();
      state.cards.page = 1;
      loadCards();
    }, 350));
  }

  // Modal: View Card
  const btnCloseCard1 = document.getElementById('btn-close-card-modal');
  const btnCloseCard2 = document.getElementById('btn-modal-close-card');
  if (btnCloseCard1) btnCloseCard1.addEventListener('click', closeCardModal);
  if (btnCloseCard2) btnCloseCard2.addEventListener('click', closeCardModal);

  const btnModalDeleteCard = document.getElementById('btn-modal-delete-card');
  if (btnModalDeleteCard) {
    btnModalDeleteCard.addEventListener('click', () => {
      if (state.selectedCard) {
        promptConfirmDelete('card', state.selectedCard.cardId, `thiệp "${state.selectedCard.title}"`);
      }
    });
  }

  // Modal: Confirm Delete
  const btnCloseConfirm1 = document.getElementById('btn-close-confirm-modal');
  const btnCancelConfirm = document.getElementById('btn-cancel-confirm');
  const btnExecuteConfirm = document.getElementById('btn-execute-confirm');
  if (btnCloseConfirm1) btnCloseConfirm1.addEventListener('click', closeConfirmModal);
  if (btnCancelConfirm) btnCancelConfirm.addEventListener('click', closeConfirmModal);
  if (btnExecuteConfirm) btnExecuteConfirm.addEventListener('click', executeConfirmDelete);

  // Close modals on clicking outside
  window.addEventListener('click', (e) => {
    const cardModal = document.getElementById('modal-view-card');
    const confirmModal = document.getElementById('modal-confirm');
    if (e.target === cardModal) closeCardModal();
    if (e.target === confirmModal) closeConfirmModal();
  });
}

// ─── INITIALIZATION ON LOAD ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEvents();

  // Kiểm tra nếu có sẵn admin key
  if (state.adminKey) {
    try {
      const stats = await adminFetch('/admin/stats');
      hideLoginOverlay();
      renderStats(stats);
      loadAllCharts();
    } catch {
      // Key đã lưu không hợp lệ, hiển thị overlay đăng nhập
      state.adminKey = '';
      sessionStorage.removeItem('admin_key');
      localStorage.removeItem('admin_key');
      showLoginOverlay(false);
    }
  } else {
    showLoginOverlay(false);
  }
});
