import { api } from './api.js';
import { CanvasParticleSystem } from './canvas-effects.js';
import { initMusicPlayer } from './music-player.js';

initMusicPlayer();

const particleSystem = new CanvasParticleSystem('bg-canvas');

let currentStudentCode = '';
let expiryTimer = null;
let resendTimer = null;

const alertBox = document.getElementById('alert-msg');
const otpAlert = document.getElementById('otp-alert');
const otpModal = document.getElementById('otp-modal');
const btnSubmit = document.getElementById('btn-submit');
const btnVerify = document.getElementById('btn-verify-otp');
const btnResend = document.getElementById('btn-resend-otp');
const btnClose = document.getElementById('btn-close-modal');
const otpInput = document.getElementById('otp-input');

function showAlert(box, msg, type = 'error') {
  box.textContent = msg;
  box.className = `alert-box alert-${type}`;
  box.style.display = 'block';
}

function hideAlert(box) {
  box.style.display = 'none';
}

const CLIENT_BANNED_WORDS = [
  // Tu tuc tieng Viet
  '\u0111\u1ecbt','\u0111it','d1t',
  'l\u1ed3n','lon','l0n',
  'c\u1eb7c','cac','c4c',
  'bu\u1ed3i','buoi','bu0i',
  '\u0111\u00e9o','deo','d3o',
  'v\u00e3i','vleu','vaileu',
  'ngu','\u0111\u1ea7n','dan',
  'm\u1ea5t d\u1ea1y','mat day',
  '\u0111\u1ee5','cut',
  'c\u1ee9t',
  'd\u00e2m','dam',
  'hi\u1ebfp','hiep',
  '\u0111\u0129','\u0111i\u1ebfm','diem',
  'kh\u1ed1n n\u1ea1n','khon nan',
  'th\u1ed1i n\u00e1t','thoi nat',
  'v\u00f4 h\u1ecdc','vo hoc',
  'm\u1eb9 m\u00e0y','me may',
  'th\u1eb1ng ch\u00f3','thang cho',
  '\u0111\u1ed3 ch\u00f3','do cho',
  's\u00fac v\u1eadt','suc vat',
  'h\u00e8n h\u1ea1',
  // Tu tieng Anh tho tuc
  'fuck','fck','shit','sh1t','bitch','asshole','bastard','cunt','dick','cock',
  'whore','slut','nigger','nigga','rape',
  // Tu nhay cam / spam
  'sex','s3x','porn','p0rn','nude','xxx','scam','hack',
  'l\u01b0\u0300a \u0111a\u0309o','lua dao',
  'casino',
  'c\u1edd b\u1ea1c','co bac',
];

function checkBannedWords(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  const tokens = lower.split(/[\s,.;:!?*_\-@#%^&()+=\[\]{}|\\/]+/).filter(Boolean);

  for (const word of CLIENT_BANNED_WORDS) {
    const cleanWord = word.toLowerCase().trim();
    if (!cleanWord) continue;
    if (cleanWord.includes(' ')) {
      if (lower.includes(cleanWord)) return word;
    } else {
      if (tokens.includes(cleanWord)) return word;
    }
  }
  return null;
}

let isLoginMode = false;
const registerOnlyFields = document.getElementById('register-only-fields');
const loginModeHint = document.getElementById('login-mode-hint');
const fullNameInput = document.getElementById('fullName');
const genderInput = document.getElementById('gender');
const classInput = document.getElementById('class');

function switchToLoginMode() {
  if (isLoginMode) return;
  isLoginMode = true;

  if (registerOnlyFields) {
    registerOnlyFields.style.transition = 'opacity 0.35s ease, max-height 0.4s ease';
    registerOnlyFields.style.opacity = '0';
    registerOnlyFields.style.overflow = 'hidden';
    registerOnlyFields.style.maxHeight = '0';
    registerOnlyFields.style.marginBottom = '0';
  }

  if (fullNameInput) { fullNameInput.required = false; fullNameInput.value = ''; }
  if (genderInput)   { genderInput.required = false; }
  if (classInput)    { classInput.value = ''; }

  if (loginModeHint) loginModeHint.style.display = 'block';

  const subtitle = document.getElementById('form-subtitle');
  if (subtitle) subtitle.textContent = 'Nh\u1eadp MSSV v\u00e0 Email \u0111\u00e3 \u0111\u0103ng k\u00fd \u0111\u1ec3 nh\u1eadn m\u00e3 x\u00e1c th\u1ef1c';
}

function switchToRegisterMode() {
  if (!isLoginMode) return;
  isLoginMode = false;

  if (registerOnlyFields) {
    registerOnlyFields.style.opacity = '1';
    registerOnlyFields.style.maxHeight = '600px';
    registerOnlyFields.style.marginBottom = '';
  }
  if (fullNameInput) fullNameInput.required = true;
  if (genderInput)   genderInput.required = true;
  if (loginModeHint) loginModeHint.style.display = 'none';

  const subtitle = document.getElementById('form-subtitle');
  if (subtitle) subtitle.textContent = 'Nh\u1eadp th\u00f4ng tin sinh vi\u00ean \u0111\u1ec3 nh\u1eadn m\u00e3 x\u00e1c th\u1ef1c qua Email';
}

document.getElementById('studentCode')?.addEventListener('input', () => {
  if (isLoginMode) switchToRegisterMode();
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(alertBox);

  const studentCode = document.getElementById('studentCode').value.trim();
  const email = document.getElementById('email').value.trim();
  const fullName = isLoginMode ? '' : (fullNameInput?.value.trim() || '');
  const classVal = isLoginMode ? '' : (classInput?.value.trim() || '');
  const gender = isLoginMode ? '' : (genderInput?.value || '');

  // Validate MSSV
  const studentCodeRegex = /^2[0-6]DH\d{6}$/i;
  if (!studentCodeRegex.test(studentCode)) {
    showAlert(alertBox, 'M\u00e3 sinh vi\u00ean kh\u00f4ng \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng! Quy \u0111\u1ecbnh: 10 k\u00fd t\u1ef1, 2 s\u1ed1 \u0111\u1ea7u t\u1eeb 20-26, ti\u1ebfp theo l\u00e0 DH, v\u00e0 6 s\u1ed1 cu\u1ed1i (V\u00ed d\u1ee5: 26DH260089).', 'error');
    return;
  }

  if (!isLoginMode && fullName) {
    const bannedWord = checkBannedWords(fullName);
    if (bannedWord) {
      showAlert(alertBox, '\u26a0\ufe0f H\u1ecd v\u00e0 t\u00ean ch\u1ee9a t\u1eeb ng\u1eef kh\u00f4ng \u0111\u01b0\u1ee3c ph\u00e9p. Vui l\u00f2ng nh\u1eadp t\u00ean th\u1eadt v\u00e0 ph\u00f9 h\u1ee3p.', 'error');
      return;
    }
  }

  const payload = { fullName, studentCode, class: classVal, gender, email };

  btnSubmit.disabled = true;
  btnSubmit.textContent = '\u0110ang x\u1eed l\u00fd & g\u1eedi email...';

  try {
    const res = await api('/auth/request-otp', {
      method: 'POST',
      body: payload
    });

    currentStudentCode = studentCode;
    document.getElementById('otp-desc').textContent = `M\u00e3 6 ch\u1eef s\u1ed1 \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi \u0111\u1ebfn ${email}. Vui l\u00f2ng ki\u1ec3m tra h\u1ed9p th\u01b0.`;

    // Mo modal OTP
    otpModal.classList.add('active');
    otpInput.value = '';
    otpInput.focus();
    hideAlert(otpAlert);

    startTimers(res.expiryMinutes || 10, 60);
  } catch (err) {
    const msg = err.message || '';
    const isRegisteredCode = msg.includes('\u0111\u00e3 \u0111\u01b0\u1ee3c \u0111\u0103ng k\u00fd') || msg.includes('\u0111\u00e3 \u0111\u01b0\u1ee3c t\u1ea1o');
    if (isRegisteredCode) {
      switchToLoginMode();
    }
    showAlert(alertBox, msg, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = isLoginMode ? '\u0110\u0103ng nh\u1eadp – G\u1eedi m\u00e3 OTP' : 'G\u1eedi m\u00e3 x\u00e1c th\u1ef1c qua Email';
  }
});

// 2. Xac thuc OTP
btnVerify.addEventListener('click', async () => {
  hideAlert(otpAlert);
  const otp = otpInput.value.trim();
  if (otp.length < 6) {
    showAlert(otpAlert, 'Vui l\u00f2ng nh\u1eadp \u0111\u1ee7 6 ch\u1eef s\u1ed1 OTP.', 'error');
    return;
  }

  btnVerify.disabled = true;
  btnVerify.textContent = '\u0110ang x\u00e1c th\u1ef1c...';

  try {
    const res = await api('/auth/verify-otp', {
      method: 'POST',
      body: { studentCode: currentStudentCode, otp: otp }
    });

    localStorage.setItem('accessToken', res.token);
    localStorage.setItem('student', JSON.stringify(res.student));

    showAlert(otpAlert, 'X\u00e1c th\u1ef1c th\u00e0nh c\u00f4ng! \u0110ang chuy\u1ec3n h\u01b0\u1edbng...', 'success');
    clearInterval(expiryTimer);
    clearInterval(resendTimer);

    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  } catch (err) {
    showAlert(otpAlert, err.message, 'error');
  } finally {
    btnVerify.disabled = false;
    btnVerify.textContent = 'X\u00e1c nh\u1eadn \u0111\u0103ng nh\u1eadp';
  }
});

// 3. Gui lai OTP
btnResend.addEventListener('click', async () => {
  hideAlert(otpAlert);
  btnResend.disabled = true;

  try {
    const res = await api('/auth/resend-otp', {
      method: 'POST',
      body: { studentCode: currentStudentCode }
    });
    showAlert(otpAlert, '\u0110\u00e3 g\u1eedi l\u1ea1i m\u00e3 OTP m\u1edbi \u0111\u1ebfn email c\u1ee7a b\u1ea1n!', 'success');
    startTimers(res.expiryMinutes || 10, 60);
  } catch (err) {
    showAlert(otpAlert, err.message, 'error');
    btnResend.disabled = false;
  }
});

btnClose.addEventListener('click', () => {
  otpModal.classList.remove('active');
  clearInterval(expiryTimer);
  clearInterval(resendTimer);
});

function startTimers(expiryMinutes, cooldownSecs) {
  clearInterval(expiryTimer);
  clearInterval(resendTimer);

  let expirySeconds = expiryMinutes * 60;
  const timeLeftEl = document.getElementById('time-left');

  expiryTimer = setInterval(() => {
    expirySeconds--;
    if (expirySeconds <= 0) {
      clearInterval(expiryTimer);
      timeLeftEl.textContent = '00:00 (H\u1ebft h\u1ea1n)';
      showAlert(otpAlert, 'M\u00e3 OTP \u0111\u00e3 h\u1ebft h\u1ea1n. Vui l\u00f2ng b\u1ea5m g\u1eedi l\u1ea1i m\u00e3 m\u1edbi.', 'error');
    } else {
      const mins = String(Math.floor(expirySeconds / 60)).padStart(2, '0');
      const secs = String(expirySeconds % 60).padStart(2, '0');
      timeLeftEl.textContent = `${mins}:${secs}`;
    }
  }, 1000);

  let cooldown = cooldownSecs;
  btnResend.disabled = true;

  resendTimer = setInterval(() => {
    cooldown--;
    if (cooldown <= 0) {
      clearInterval(resendTimer);
      btnResend.disabled = false;
      btnResend.textContent = 'G\u1eedi l\u1ea1i m\u00e3 OTP';
    } else {
      btnResend.disabled = true;
      btnResend.textContent = `G\u1eedi l\u1ea1i m\u00e3 OTP (${cooldown}s)`;
    }
  }, 1000);
}
