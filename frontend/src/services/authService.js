import apiClient from './apiClient.js';

export const authService = {
  async register(payload) {
    const { data } = await apiClient.post('/auth/register', payload);
    return data.data;
  },

  async login(payload) {
    const { data } = await apiClient.post('/auth/login', payload);
    return data.data;
  },

  async logout() {
    await apiClient.post('/auth/logout');
  },

  async getMe() {
    const { data } = await apiClient.get('/auth/me');
    return data.data.user;
  },

  async updateMe(payload) {
    const { data } = await apiClient.patch('/auth/me', payload);
    return data.data.user;
  },

  async changePassword(payload) {
    const { data } = await apiClient.post('/auth/change-password', payload);
    return data;
  },

  async forgotPassword(payload) {
    const { data } = await apiClient.post('/auth/forgot-password', payload);
    return data;
  },

  async resetPassword(payload) {
    const { data } = await apiClient.post('/auth/reset-password', payload);
    return data;
  },
};

