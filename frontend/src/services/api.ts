import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const menuApi = {
  getRestaurant: () => api.get('/menu/restaurant'),
  getCategories: () => api.get('/menu/categories'),
  getFoods: (params?: Record<string, string | number>) => api.get('/menu/foods', { params }),
  getFood: (slug: string) => api.get(`/menu/foods/${slug}`),
  getRecommendations: (budget?: number) => api.get('/menu/recommendations', { params: { budget } }),
};

export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const orderApi = {
  create: (data: unknown) => api.post('/orders', data),
  track: (orderNumber: string) => api.get(`/orders/${orderNumber}/track`),
  list: () => api.get('/orders'),
};

export const paymentApi = {
  initialize: (data: { orderId: string; provider: string }) => api.post('/payments/initialize', data),
  verify: (reference: string) => api.post(`/payments/verify/${reference}`),
};

export const couponApi = {
  validate: (code: string, subtotal: number) => api.post('/coupons/validate', { code, subtotal }),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  foods: () => api.get('/admin/foods'),
  inventory: () => api.get('/admin/inventory'),
};

export default api;
