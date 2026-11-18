import apiClient, { mutateWithOfflineQueue } from './apiClient.js';

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
    return mutateWithOfflineQueue({
      method: 'POST',
      url: `/rooms/${roomId}/staircases`,
      data: payload,
      label: `Add staircase "${payload?.name || 'Staircase'}"`,
      mockResult: {
        id: `offline-staircase-${Date.now()}`,
        roomId,
        name: payload?.name,
        ...payload,
      },
    });
  },

  async update(staircaseId, payload) {
    return mutateWithOfflineQueue({
      method: 'PATCH',
      url: `/staircases/${staircaseId}`,
      data: payload,
      label: `Update staircase "${payload?.name || ''}"`,
      mockResult: { id: staircaseId, ...payload },
    });
  },

  async remove(staircaseId) {
    return mutateWithOfflineQueue({
      method: 'DELETE',
      url: `/staircases/${staircaseId}`,
      label: `Delete staircase`,
      mockResult: { id: staircaseId, deleted: true },
    });
  },
};

