// src/main.js - frontend logic with Gender-Adaptive Tabs and Card Creation
import { api } from './api.js';
import { CanvasParticleSystem } from './canvas-effects.js';

// Canvas background particle system
const particleSystem = new CanvasParticleSystem('bg-canvas');

// 1. Auth check
const token = localStorage.getItem('accessToken');
const studentJson = localStorage.getItem('student');

if (!token) {
  window.location.href = 'login.html';
}

let currentUser = null;
if (studentJson) {
  try {
    currentUser = JSON.parse(studentJson);
    const greetingEl = document.getElementById('user-greeting');
    const genderTag = document.getElementById('gender-tag');

    if (greetingEl) {
      greetingEl.textContent = `${currentUser.fullName} (${currentUser.studentCode})`;
    }
    if (genderTag) {
      const isNam = currentUser.gender === 'Nam' || currentUser.gender === 'Male';
      genderTag.textContent = isNam ? '👦 Nam sinh' : '👧 Nữ sinh';
      genderTag.className = `badge-gender ${isNam ? 'nam' : 'nu'}`;
    }
  } catch (e) {
    console.error('Error parsing student info', e);
  }
}

// 2. Logout
document.getElementById('btn-logout')?.addEventListener('click', () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('student');
  window.location.href = 'login.html';
});

// 3. Tab Navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const isMale = currentUser && (currentUser.gender === 'Nam' || currentUser.gender === 'Male');

// Nam: hide inbox tab
const inboxTabBtn = document.getElementById('btn-tab-inbox');
const inboxPane = document.getElementById('pane-inbox');
if (isMale) {
  if (inboxTabBtn) inboxTabBtn.style.display = 'none';
  if (inboxPane) inboxPane.style.display = 'none';
}

function switchTab(tabId) {
  if (isMale && tabId === 'inbox') tabId = 'create';

  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });

  if (tabId === 'inbox' && !isMale) loadReceivedCards();
  if (tabId === 'sent') loadSentCards();
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

// Default tab: Nam -> create; Nu -> inbox
switchTab(isMale ? 'create' : 'inbox');

if (isMale) {
  // Show template selector for male users only
  const tmplGrp = document.getElementById('template-group');
  if (tmplGrp) tmplGrp.style.display = 'block';
}

// Khởi tạo trình soạn thảo TinyMCE: Lấy API key từ Backend (appsettings.json)
async function setupTinyMCE() {
  let apiKey = '';
  try {
    const data = await api('/tinymce/key');
    if (data && data.key) {
      apiKey = data.key.trim();
    }
  } catch (e) {
    console.warn('Không thể lấy TinyMCE API key từ backend:', e);
  }

  // Nạp thư viện TinyMCE
  await new Promise((resolve, reject) => {
    if (window.tinymce) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.referrerPolicy = 'origin';

    // Nếu bạn đã điền key trong backend appsettings.json -> dùng Cloud TinyMCE với key đó
    if (apiKey && apiKey !== 'no-api-key') {
      script.src = `https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js`;
    } else {
      // Nếu chưa điền key trong appsettings.json -> dùng CDN cộng đồng miễn phí (không bao giờ báo lỗi key)
      script.src = `https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.3/tinymce.min.js`;
    }

    script.onload = resolve;
    script.onerror = () => {
      // Dự phòng nếu CDN chính gặp sự cố mạng
      const fallback = document.createElement('script');
      fallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.3/tinymce.min.js';
      fallback.onload = resolve;
      fallback.onerror = reject;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  });

  // Hủy instance cũ nếu đã tồn tại để tránh xung đột
  if (window.tinymce?.get('cardMessage')) {
    window.tinymce.get('cardMessage').remove();
  }

  window.tinymce.init({
    selector: '#cardMessage',
    plugins: 'image link lists',
    toolbar:
      'undo redo | bold italic underline | alignleft aligncenter alignright | bullist numlist | image | forecolor backcolor',
    height: 250,
    menubar: false,
    statusbar: false,
    promotion: false,
    branding: false,
    automatic_uploads: true,
    images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blobInfo.blob());
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject('Image upload failed');
    }),
    setup: (editor) => {
      editor.on('Change input undo redo', () => editor.save());
    },
  });
}
setupTinyMCE();


// 4. Wish suggestion chips
document.querySelectorAll('.wish-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const wish = chip.dataset.wish;
    const editor = typeof tinymce !== 'undefined' && tinymce.get('cardMessage');
    if (editor) {
      editor.setContent(`<p>${wish}</p>`);
    } else {
      const msgInput = document.getElementById('cardMessage');
      if (msgInput) { msgInput.value = wish; msgInput.focus(); }
    }
  });
});


// Envelope skin picker selection (male users only)
document.querySelectorAll('.envelope-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.envelope-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const theme = opt.dataset.theme || 'classic';
    const input = document.getElementById('selectedEnvelopeTheme');
    if (input) input.value = theme;
  });
});

// ─── TÌM KIẾM BẠN NỮ & TỰ ĐỘNG ĐIỀN MSSV + HỌ TÊN (TỐI ƯU HIỆU SUẤT) ──────────
const recipientSearchInput = document.getElementById('recipientSearch');
const recipientDropdown = document.getElementById('recipient-dropdown');
const searchSpinner = document.getElementById('recipient-search-spinner');
const recipientCodeInput = document.getElementById('recipientCode');
const recipientNameInput = document.getElementById('recipientName');

// Cache kết quả tìm kiếm cục bộ để không bao giờ gọi trùng lặp (Instant 0ms response)
const searchCache = new Map();
let searchDebounceTimer = null;
let currentAbortController = null;

async function performRecipientSearch(query) {
  const trimmed = (query || '').trim();

  // Kiểm tra cache trước để phản hồi tức thì
  if (searchCache.has(trimmed)) {
    renderRecipientSuggestions(searchCache.get(trimmed));
    return;
  }

  // Hủy request trước nếu đang chạy dở (tránh race condition khi gõ nhanh)
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  if (searchSpinner) searchSpinner.style.display = 'block';

  try {
    const list = await api(`/cards/recipients?search=${encodeURIComponent(trimmed)}`, {
      signal: currentAbortController.signal
    });

    searchCache.set(trimmed, list || []);
    renderRecipientSuggestions(list || []);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Lỗi tìm kiếm bạn nữ:', err);
    }
  } finally {
    if (searchSpinner) searchSpinner.style.display = 'none';
  }
}

function renderRecipientSuggestions(students) {
  if (!recipientDropdown) return;

  if (!students || students.length === 0) {
    recipientDropdown.innerHTML = `
      <div class="recipient-empty-msg">
        🌸 Không tìm thấy bạn nữ nào với từ khóa này.<br>
        <span style="font-size:0.75rem; color:#94a3b8;">(Bạn vẫn có thể tự gõ MSSV bên dưới để gửi nhé)</span>
      </div>
    `;
    recipientDropdown.style.display = 'block';
    return;
  }

  recipientDropdown.innerHTML = students.map(s => `
    <div class="recipient-item" data-code="${escapeHtml(s.studentCode)}" data-name="${escapeHtml(s.fullName)}">
      <div class="recipient-info-left">
        <div class="recipient-avatar-badge">🌸</div>
        <div class="recipient-name-col">
          <span class="recipient-full-name">${escapeHtml(s.fullName)}</span>
          <span class="recipient-class">${escapeHtml(s.class || 'Lớp chưa cập nhật')}</span>
        </div>
      </div>
      <span class="recipient-code-badge">${escapeHtml(s.studentCode)}</span>
    </div>
  `).join('');

  recipientDropdown.style.display = 'block';

  // Xử lý sự kiện click chọn bạn nữ
  recipientDropdown.querySelectorAll('.recipient-item').forEach(item => {
    item.addEventListener('click', () => {
      const code = item.getAttribute('data-code');
      const name = item.getAttribute('data-name');

      // Tự động điền vào 2 ô
      if (recipientCodeInput) recipientCodeInput.value = code;
      if (recipientNameInput) recipientNameInput.value = name;
      if (recipientSearchInput) recipientSearchInput.value = `${name} (${code})`;

      // Ẩn dropdown
      recipientDropdown.style.display = 'none';

      // Hiệu ứng phản hồi nhẹ (glow xanh báo thành công)
      recipientCodeInput?.classList.add('input-highlight-pulse');
      recipientNameInput?.classList.add('input-highlight-pulse');
      setTimeout(() => {
        recipientCodeInput?.classList.remove('input-highlight-pulse');
        recipientNameInput?.classList.remove('input-highlight-pulse');
      }, 1000);

      showToast(`Đã chọn: ${name} (${code}) 🌸`, 'success');
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Bắt sự kiện gõ ô tìm kiếm với Debounce 280ms
recipientSearchInput?.addEventListener('input', (e) => {
  clearTimeout(searchDebounceTimer);
  const val = e.target.value;
  searchDebounceTimer = setTimeout(() => {
    performRecipientSearch(val);
  }, 280);
});

// Khi focus vào ô tìm kiếm -> hiển thị ngay danh sách gợi ý bạn nữ
recipientSearchInput?.addEventListener('focus', () => {
  performRecipientSearch(recipientSearchInput.value);
});

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', (e) => {
  if (!e.target.closest('.recipient-search-box')) {
    if (recipientDropdown) recipientDropdown.style.display = 'none';
  }
});

// Nhấn phím Escape đóng dropdown
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && recipientDropdown) {
    recipientDropdown.style.display = 'none';
  }
});

// 5. Create & Send Card Form
const createForm = document.getElementById('create-card-form');
const btnSubmitCard = document.getElementById('btn-submit-card');

createForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const recipientCode = document.getElementById('recipientCode').value.trim();
  const recipientName = document.getElementById('recipientName').value.trim();
  const title = document.getElementById('cardTitle').value.trim();
  const message = (tinymce.get('cardMessage')
    ? tinymce.get('cardMessage').getContent({ format: 'html' })
    : document.getElementById('cardMessage').value).trim();

  if (!recipientCode || !title || !message) {
    showToast('Vui lòng điền đầy đủ Mã sinh viên, tiêu đề và lời chúc!', 'error');
    return;
  }

  btnSubmitCard.disabled = true;
  btnSubmitCard.textContent = 'Đang gửi thiệp... 🌸';

  try {
    const res = await api('/cards', {
      method: 'POST',
      body: { recipientCode, recipientName, title, message }
    });

    const themeInput = document.getElementById('selectedEnvelopeTheme');
    const chosenTheme = themeInput ? themeInput.value : 'classic';
    if (res && (res.cardId || res.id)) {
      localStorage.setItem(`envelope_theme_${res.cardId || res.id}`, chosenTheme);
    }

    showToast(res.message || 'Gửi thiệp thành công! 🌸');
    createForm.reset();
    if (recipientSearchInput) recipientSearchInput.value = '';
    document.getElementById('cardTitle').value = '🌸 Chúc mừng bạn ngày 20/10 thật hạnh phúc!';

    setTimeout(() => { switchTab('sent'); }, 1200);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmitCard.disabled = false;
    btnSubmitCard.textContent = '🌸 Gửi thiệp chúc mừng ngay';
  }
});

// 6. Fan layout - always fan mode, responsive mobile
function applyFanTransforms(container) {
  if (!container) return;
  const cards = container.querySelectorAll('.lixi-card');
  const N = cards.length;
  if (N === 0) return;

  const isMobile = window.innerWidth <= 600;
  const center = (N - 1) / 2;
  const maxSpreadDeg = isMobile
    ? Math.min(32, Math.max(10, (N - 1) * 4))
    : Math.min(48, Math.max(16, (N - 1) * 6.5));
  const stepDeg = N > 1 ? (maxSpreadDeg * 2) / (N - 1) : 0;

  const maxTotalWidth = isMobile
    ? Math.min(260, Math.max(50, (N - 1) * 34))
    : Math.min(680, Math.max(100, (N - 1) * 68));
  const stepX = N > 1 ? maxTotalWidth / (N - 1) : 0;

  cards.forEach((card, i) => {
    const delta = i - center;
    const angle = N > 1 ? -maxSpreadDeg + i * stepDeg : 0;
    const tx = delta * stepX;
    const ty = Math.abs(delta) * Math.min(8, 25 / (N || 1));

    card.style.setProperty('--tx', `${tx.toFixed(1)}px`);
    card.style.setProperty('--ty', `${ty.toFixed(1)}px`);
    card.style.setProperty('--rot', `${angle.toFixed(1)}deg`);
    card.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg)`;
    card.style.zIndex = i + 1;
  });
}

// 7. Create envelope card DOM element
function createLixiCardElement(card, isSent) {
  const cardEl = document.createElement('div');
  cardEl.className = 'lixi-card';

  const dateStr = new Date(card.createdAt).toLocaleDateString('vi-VN');
  const recipientDisplay = card.recipientName || 'Bạn nữ thân mến';
  const senderDisplay = card.senderName || 'Người bạn giấu tên';

  const statusHtml = card.seenAt
    ? `<span class="vintage-seal-badge opened">✓ Đã mở thư ✨</span>`
    : `<span class="vintage-seal-badge sealed">● Niêm phong 📜</span>`;

  // Envelope theme: check saved theme or deterministic theme
  const themes = ['classic', 'rose', 'royal', 'jade'];
  const symbols = { classic: '⚜️', rose: '🌸', royal: '👑', jade: '🍀' };
  const savedTheme = card.id ? localStorage.getItem(`envelope_theme_${card.id}`) : null;
  const hash = Math.abs(
    (card.id || card.title || '')
      .toString()
      .split('')
      .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
  );
  const theme = savedTheme || themes[hash % themes.length];
  const waxSymbol = symbols[theme] || '⚜️';

  cardEl.innerHTML = `
    <div class="vintage-envelope theme-${theme}">
      <div class="vintage-flap">
        <div class="vintage-wax-seal" title="Dấu sáp niêm phong cổ điển">
          <span class="wax-symbol">${waxSymbol}</span>
        </div>
      </div>

      <div class="vintage-postage">
        <div class="vintage-stamp">
          <span>🌸</span>
          <small>20/10</small>
        </div>
        <div class="vintage-postmark">
          <span>HANOI</span>
          <span>★ 20.10 ★</span>
        </div>
      </div>

      <div class="vintage-corner top-left">⚜</div>
      <div class="vintage-corner top-right">⚜</div>
      <div class="vintage-corner bottom-left">⚜</div>
      <div class="vintage-corner bottom-right">⚜</div>

      <div class="vintage-inner-frame">
        <div class="vintage-dest-block">
          <div class="vintage-line">
            <span class="v-label">Kính gửi (To):</span>
            <span class="v-name">${recipientDisplay}</span>
          </div>
          <div class="vintage-line">
            <span class="v-label">Gửi từ (From):</span>
            <span class="v-name">${senderDisplay}</span>
          </div>
        </div>

        <div class="vintage-card-divider">
          <span>❧ 🌸 ☙</span>
        </div>

        <h4 class="vintage-card-title" title="${card.title}">
          "${card.title}"
        </h4>

        <div class="vintage-status-row">
          ${statusHtml}
        </div>

        <div class="vintage-card-footer">
          <span class="vintage-date">📜 Ngày ${dateStr}</span>
          <span class="vintage-open-btn">Mở bức thư 🌸</span>
        </div>
      </div>
    </div>
  `;

  cardEl.addEventListener('click', () => {
    openCardModal(card, isSent);
  });

  return cardEl;
}

// 8. Load received cards (Nu sinh)
async function loadReceivedCards() {
  const list = document.getElementById('card-list');
  try {
    const { cards, unseenCount } = await api('/cards');
    updateBadges(unseenCount);

    list.innerHTML = '';
    if (!cards || cards.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="width: 100%;">
          🌸 Bạn chưa nhận được phong bao thiệp nào.<br/>
          Hãy chia sẻ mã sinh viên của mình để nhận những bức thư thiệp cổ điển ấm áp nhé!
        </div>`;
      return;
    }

    cards.forEach(card => {
      const cardEl = createLixiCardElement(card, false);
      list.appendChild(cardEl);
    });

    applyFanTransforms(list);
  } catch (e) {
    console.error('Failed to load inbox cards', e);
    list.innerHTML = `<div class="empty-state" style="width: 100%;">⚠️ Không thể tải thiệp nhận được.</div>`;
  }
}

// 9. Load sent cards
async function loadSentCards() {
  const sentList = document.getElementById('sent-list');
  try {
    const { cards, totalSent } = await api('/cards/sent');
    const sentCountEl = document.getElementById('sent-count');
    if (sentCountEl) {
      sentCountEl.textContent = totalSent;
      sentCountEl.style.display = totalSent > 0 ? 'inline-block' : 'none';
    }

    sentList.innerHTML = '';
    if (!cards || cards.length === 0) {
      sentList.innerHTML = `
        <div class="empty-state" style="width: 100%;">
          💌 Bạn chưa tạo phong bao thiệp nào.<br/>
          Hãy chuyển qua tab <b>"Gửi thiệp 20/10"</b> để tạo bức thư thiệp gửi tặng các bạn nữ nhé!
        </div>`;
      return;
    }

    cards.forEach(card => {
      const cardEl = createLixiCardElement(card, true);
      sentList.appendChild(cardEl);
    });

    applyFanTransforms(sentList);
  } catch (e) {
    console.error('Failed to load sent cards', e);
    sentList.innerHTML = `<div class="empty-state" style="width: 100%;">⚠️ Không thể tải danh sách thiệp đã tạo.</div>`;
  }
}

// 10. Modal
const modal = document.getElementById('card-modal');
const modalTitle = document.getElementById('modal-title');
const modalFrom = document.getElementById('modal-from');
const modalMsg = document.getElementById('modal-msg');
const modalClose = document.getElementById('modal-close');

modalClose?.addEventListener('click', () => {
  modal.classList.remove('active');
});

modal?.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});

async function openCardModal(card, isSent = false) {
  modalTitle.textContent = card.title;

  const recipientDisplay = card.recipientName || 'Bạn nữ thân mến';
  const senderDisplay = card.senderName || 'Người bạn giấu tên';
  const recipientCodeStr = card.recipientCode ? ` (MSSV: ${card.recipientCode})` : '';
  const senderClassStr = card.senderClass ? ` (${card.senderClass})` : '';

  modalFrom.innerHTML = `
    <div class="vintage-letter-header-block">
      <div class="vintage-wax-seal-large">
        <span>⚜️</span>
      </div>
      <div class="vintage-letter-title-sub">THƯ CHÚC MỪNG PHỤ NỮ VIỆT NAM 20/10</div>
      <div class="vintage-letter-meta-grid">
        <div><b>Kính gửi:</b> ${recipientDisplay}${recipientCodeStr}</div>
        <div><b>Gửi từ:</b> ${senderDisplay}${senderClassStr}</div>
        <div style="grid-column: 1 / -1; margin-top: 2px;">
          <i>Gửi trao ngày: ${new Date(card.createdAt).toLocaleString('vi-VN')}</i>
          ${card.seenAt
            ? ` — <span style="color: #2e7d32; font-weight: 600;">✓ Người nhận đã mở xem lúc ${new Date(card.seenAt).toLocaleTimeString('vi-VN')} ngày ${new Date(card.seenAt).toLocaleDateString('vi-VN')}</span>`
            : ' — <span style="color: #c62828; font-weight: 600;">⏳ Bức thư chưa được mở</span>'}
        </div>
      </div>
    </div>
  `;

  modalMsg.innerHTML = card.message;
  modal.classList.add('active');

  // Mark as seen if recipient opens
  if (!isSent && !card.seenAt) {
    try {
      await api(`/cards/${card.cardId}/seen`, {
        method: 'POST',
        body: { deviceId: navigator.userAgent }
      });
      card.seenAt = new Date().toISOString();
      loadReceivedCards();
    } catch (e) {
      console.warn('Mark seen failed', e);
    }
  }
}

// 11. Badges
function updateBadges(unseenCount) {
  const badge = document.getElementById('unseen-badge');
  const inboxCount = document.getElementById('inbox-count');

  if (unseenCount > 0) {
    if (badge) {
      badge.textContent = `${unseenCount} thiệp mới`;
      badge.style.display = 'inline-block';
    }
    if (inboxCount) {
      inboxCount.textContent = unseenCount;
      inboxCount.style.display = 'inline-block';
    }
  } else {
    if (badge) badge.style.display = 'none';
    if (inboxCount) inboxCount.style.display = 'none';
  }
}

// 12. Toast
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.background = type === 'error' ? '#c62828' : '#2e7d32';
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// 13. Init on load
window.addEventListener('DOMContentLoaded', () => {
  if (!isMale) loadReceivedCards();
  loadSentCards();
});

// 14. Recalculate fan on resize/rotate
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const cardList = document.getElementById('card-list');
    const sentList = document.getElementById('sent-list');
    if (cardList) applyFanTransforms(cardList);
    if (sentList) applyFanTransforms(sentList);
  }, 200);
});