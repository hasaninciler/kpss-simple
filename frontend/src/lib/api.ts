import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL + '/api' });

api.interceptors.request.use(cfg => {
  const t = typeof window !== 'undefined' && localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  // Sadece gerçekten token geçersizse login'e at.
  // Rastgele bir endpoint hatası (tablo yok, sunucu hatası) çıkışa sebep olmasın.
  if (err.response?.status === 401 && typeof window !== 'undefined') {
    const url = err.config?.url || '';
    // Login/register denemesi değilse ve auth kontrolüyse çıkış yap
    const isAuthCheck = url.includes('/auth/me');
    if (isAuthCheck) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(err);
});

export default api;
