import apiClient from './apiClient.js';

export const staircaseService = {
  async listByRoom(roomId) {
    const { data } = await apiClient.get(`/rooms/${roomId}/staircases`);
    return data.data;
  },

  async listByBuilding(buildingId) {
    const { data } = await apiClient.get(`/buildings/${buildingId}/staircases`);
    return data.data;
  },

  async create(roomId, payload) {
    const { data } = await apiClient.post(`/rooms/${roomId}/staircases`, payload);
    return data.data;
  },

  async update(staircaseId, payload) {
    const { data } = await apiClient.patch(`/staircases/${staircaseId}`, payload);
    return data.data;
  },

  async remove(staircaseId) {
    const { data } = await apiClient.delete(`/staircases/${staircaseId}`);
    return data.data;
  },
};

