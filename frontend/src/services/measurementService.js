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
    return mutateWithOfflineQueue({
      method: 'PATCH',
      url: `/measurements/${measurementId}`,
      data: payload,
      label: `Update measurement`,
      mockResult: { id: measurementId, ...payload },
    });
  },

  async duplicate(measurementId) {
    const { data } = await apiClient.post(`/measurements/${measurementId}/duplicate`);
    return data.data;
  },

  async remove(measurementId) {
    return mutateWithOfflineQueue({
      method: 'DELETE',
      url: `/measurements/${measurementId}`,
      label: `Delete measurement`,
      mockResult: { id: measurementId, deleted: true },
    });
  },

  async getHistory(measurementId) {
    const { data } = await apiClient.get(`/measurements/${measurementId}/history`);
    return data.data;
  },
};

