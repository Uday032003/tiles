import apiClient, { mutateWithOfflineQueue } from './apiClient.js';

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
    return mutateWithOfflineQueue({
      method: 'POST',
      url: `/buildings/${buildingId}/floors`,
      data: payload,
      label: `Add floor "${payload?.name || 'Floor'}"`,
      mockResult: {
        id: `offline-floor-${Date.now()}`,
        name: payload?.name,
        buildingId,
        rooms: [],
      },
    });
  },

  async update(floorId, payload) {
    return mutateWithOfflineQueue({
      method: 'PATCH',
      url: `/floors/${floorId}`,
      data: payload,
      label: `Update floor`,
      mockResult: { id: floorId, ...payload },
    });
  },

  async remove(floorId) {
    return mutateWithOfflineQueue({
      method: 'DELETE',
      url: `/floors/${floorId}`,
      label: `Delete floor`,
      mockResult: { id: floorId, deleted: true },
    });
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

