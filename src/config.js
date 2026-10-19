
const BACKEND_URL = 'https://considered-luther-colony-essay.trycloudflare.com/api'; 

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
export const MUSIC_URL = 'assets/bg-music.mp3';

