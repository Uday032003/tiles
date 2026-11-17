import apiClient from './apiClient.js';

export const buildingService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/buildings', { params });
    return { items: data.data, meta: data.meta };
  },

  async getById(id) {
    const { data } = await apiClient.get(`/buildings/${id}`);
    return data.data;
  },

  async getTree(id) {
    const { data } = await apiClient.get(`/buildings/${id}/tree`);
    return data.data;
  },

  async initLayout(id, layout = 'STANDARD_RESIDENTIAL') {
    const { data } = await apiClient.post(`/buildings/${id}/init-layout`, { layout });
    return data.data;
  },

  async create(payload) {
    const { data } = await apiClient.post('/buildings', payload);
    return data.data;
  },

  async update(id, payload) {
    const { data } = await apiClient.patch(`/buildings/${id}`, payload);
    return data.data;
  },

  async archive(id) {
    const { data } = await apiClient.post(`/buildings/${id}/archive`);
    return data.data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`/buildings/${id}`);
    return data.data;
  },
};

