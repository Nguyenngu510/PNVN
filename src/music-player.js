

import { MUSIC_URL } from './config.js';

export function initMusicPlayer() {

  if (document.getElementById('music-player-widget')) return;

  let audio = document.getElementById('bg-music');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'bg-music';
    audio.loop = true;
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }

  if (MUSIC_URL && MUSIC_URL.trim() !== '') {
    audio.src = MUSIC_URL;
  } else if (!audio.getAttribute('src')) {
    audio.src = 'assets/bg-music.mp3';
  }

  audio.volume = parseFloat(localStorage.getItem('bg_music_volume') || '0.5');

  const widget = document.createElement('div');
  widget.id = 'music-player-widget';
  widget.className = 'music-player-widget';
  widget.innerHTML = `
    <button type="button" id="btn-music-toggle" class="music-toggle-btn" title="Bật / Tắt nhạc nền 20/10">
      <div class="music-disc-icon">
        <span class="disc-symbol">💿</span>
        <div class="equalizer-waves">
          <span class="eq-bar bar-1"></span>
          <span class="eq-bar bar-2"></span>
          <span class="eq-bar bar-3"></span>
        </div>
      </div>
      <span class="music-label" id="music-status-text">Bật nhạc 🌸</span>
    </button>
    <div class="music-volume-panel">
      <span class="volume-icon">🔈</span>
      <input type="range" id="music-volume-slider" min="0" max="1" step="0.05" value="${audio.volume}" title="Điều chỉnh âm lượng" />
      <span class="volume-icon">🔊</span>
    </div>
  `;
  document.body.appendChild(widget);

  const btnToggle = widget.querySelector('#btn-music-toggle');
  const statusText = widget.querySelector('#music-status-text');
  const volumeSlider = widget.querySelector('#music-volume-slider');

  function updateUIState(isPlaying) {
    if (isPlaying) {
      widget.classList.add('playing');
      widget.classList.remove('paused');
      if (statusText) statusText.textContent = 'Đang phát 🎶';
      btnToggle?.setAttribute('title', 'Nhấn để tạm dừng nhạc nền');
    } else {
      widget.classList.remove('playing');
      widget.classList.add('paused');
      if (statusText) statusText.textContent = 'Tắt nhạc 🔇';
      btnToggle?.setAttribute('title', 'Nhấn để bật nhạc nền 20/10');
    }
  }

  function showMusicNotification(msg) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.style.display = 'block';
      toast.style.background = '#880e4f';
      toast.style.color = '#fff';
      clearTimeout(window.__musicToastTimer);
      window.__musicToastTimer = setTimeout(() => {
        toast.style.display = 'none';
      }, 4500);
    } else {
      console.warn(msg);
    }
  }

  async function playMusic(isUserAction = false) {
    try {
      await audio.play();
      updateUIState(true);
      localStorage.setItem('bg_music_disabled', 'false');
    } catch (err) {
      updateUIState(false);
      if (isUserAction) {
        if (err.name === 'NotSupportedError' || audio.error) {
          showMusicNotification('🎵 Chưa tìm thấy file nhạc. Vui lòng đặt file nhạc vào thư mục frontend/assets/ hoặc cập nhật URL trong src/config.js!');
        } else {
          console.log('Không thể phát nhạc:', err.message);
        }
      } else {
        console.log('Trình duyệt chặn Autoplay âm thanh, chờ tương tác người dùng...');
      }
    }
  }

  function pauseMusic() {
    audio.pause();
    updateUIState(false);
    localStorage.setItem('bg_music_disabled', 'true');
  }

  btnToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      playMusic(true);
    } else {
      pauseMusic();
    }
  });

  volumeSlider?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audio.volume = val;
    localStorage.setItem('bg_music_volume', val.toString());
  });

  const userDisabled = localStorage.getItem('bg_music_disabled') === 'true';

  if (!userDisabled) {

    playMusic();

    const enableAudioOnFirstInteraction = () => {
      if (audio.paused && localStorage.getItem('bg_music_disabled') !== 'true') {
        playMusic();
      }
      window.removeEventListener('click', enableAudioOnFirstInteraction);
      window.removeEventListener('keydown', enableAudioOnFirstInteraction);
      window.removeEventListener('touchstart', enableAudioOnFirstInteraction);
    };

    window.addEventListener('click', enableAudioOnFirstInteraction, { passive: true });
    window.addEventListener('keydown', enableAudioOnFirstInteraction, { passive: true });
    window.addEventListener('touchstart', enableAudioOnFirstInteraction, { passive: true });
  } else {
    updateUIState(false);
  }
}
