import apiClient, { mutateWithOfflineQueue } from './apiClient.js';

export const measurementService = {
  async listWorkTypes() {
    const { data } = await apiClient.get('/work-types');
    return data.data;
  },

  async list(params = {}) {
    const { data } = await apiClient.get('/measurements', { params });
    return { items: data.data, meta: data.meta };
  },

  async listByRoom(roomId) {
    const { data } = await apiClient.get(`/rooms/${roomId}/measurements`);
    return data.data;
  },

  async getBuildingSummary(buildingId) {
    const { data } = await apiClient.get(`/buildings/${buildingId}/area-summary`);
    return data.data;
  },

  async getFloorSummary(floorId) {
    const { data } = await apiClient.get(`/floors/${floorId}/area-summary`);
    return data.data;
  },

  async create(roomId, payload) {
    return mutateWithOfflineQueue({
      method: 'POST',
      url: `/rooms/${roomId}/measurements`,
      data: payload,
      label: `Add measurement "${payload?.name || 'Entry'}"`,
    });
  },

  async update(measurementId, payload) {
    const { data } = await apiClient.patch(`/measurements/${measurementId}`, payload);
    return data.data;
  },

  async duplicate(measurementId) {
    const { data } = await apiClient.post(`/measurements/${measurementId}/duplicate`);
    return data.data;
  },

  async remove(measurementId) {
    const { data } = await apiClient.delete(`/measurements/${measurementId}`);
    return data.data;
  },

  async getHistory(measurementId) {
    const { data } = await apiClient.get(`/measurements/${measurementId}/history`);
    return data.data;
  },
};

