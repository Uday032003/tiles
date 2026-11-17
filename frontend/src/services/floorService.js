import apiClient from './apiClient.js';

export const floorService = {
  async listByBuilding(buildingId) {
    const { data } = await apiClient.get(`/buildings/${buildingId}/floors`);
    return data.data;
  },

  async getById(floorId) {
    const { data } = await apiClient.get(`/floors/${floorId}`);
    return data.data;
  },

  async create(buildingId, payload) {
    const { data } = await apiClient.post(`/buildings/${buildingId}/floors`, payload);
    return data.data;
  },

  async update(floorId, payload) {
    const { data } = await apiClient.patch(`/floors/${floorId}`, payload);
    return data.data;
  },

  async remove(floorId) {
    const { data } = await apiClient.delete(`/floors/${floorId}`);
    return data.data;
  },

  async reorder(buildingId, floorIds) {
    const { data } = await apiClient.patch(`/buildings/${buildingId}/floors/reorder`, { floorIds });
    return data.data;
  },

  async duplicate(floorId, payload) {
    const { data } = await apiClient.post(`/floors/${floorId}/duplicate`, payload);
    return data.data;
  },
};

