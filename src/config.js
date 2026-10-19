
const BACKEND_URL = 'http://123.27.226.178:5000/'; 

export const API_BASE = window.API_BASE_URL || (
  BACKEND_URL !== '' 
    ? BACKEND_URL 
    : (
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
          ? (location.port && location.port !== '5000' && location.protocol.startsWith('http')
              ? 'http://localhost:5000/api' 
              : '/api')
          : '/api'
      )
);

/**
 * 👉 CẤU HÌNH ĐƯỜNG DẪN NHẠC NỀN:
 * 
 * - Bạn chỉ cần copy file nhạc (định dạng .mp3, .wav, .ogg, .m4a) vào thư mục: frontend/assets/
 *   (Ví dụ: frontend/assets/bg-music.mp3)
 * - Sau đó sửa tên file ở biến MUSIC_URL bên dưới.
 * - Hoặc bạn có thể dán trực tiếp một đường link nhạc online (https://...) vào đây.
 */
export const MUSIC_URL = 'assets/bg-music.mp3';

