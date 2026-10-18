/**
 * CẤU HÌNH KẾT NỐI API CHO TOÀN BỘ FRONTEND
 * 
 * - Chạy Local: Hệ thống tự động nhận diện localhost.
 * - Triển khai Frontend lên GitHub Pages:
 *   + Điền URL public của Backend vào biến BACKEND_URL bên dưới.
 *   + LƯU Ý QUAN TRỌNG: GitHub Pages chạy HTTPS, vì vậy URL Backend BẮT BUỘC phải là HTTPS
 *     (ví dụ dùng Cloudflare Tunnel hoặc ngrok HTTPS: https://your-tunnel.trycloudflare.com/api)
 *     để không bị trình duyệt chặn lỗi Mixed Content (HTTPS -> HTTP).
 */

// 👉 ĐIỀN ĐỊA CHỈ BACKEND CỦA BẠN VÀO ĐÂY KHI DEPLOY LÊN GITHUB:
// Ví dụ: const BACKEND_URL = 'https://card2010-backend.trycloudflare.com/api';
const BACKEND_URL = ''; 

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

