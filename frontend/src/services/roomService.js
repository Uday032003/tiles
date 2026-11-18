import apiClient, { mutateWithOfflineQueue } from './apiClient.js';

export const roomService = {
  async listRoomTypes() {
    const { data } = await apiClient.get('/room-types');
    return data.data;
  },

  async listByFloor(floorId) {
    const { data } = await apiClient.get(`/floors/${floorId}/rooms`);
    return data.data;
  },

  async getById(roomId) {
    const { data } = await apiClient.get(`/rooms/${roomId}`);
    return data.data;
  },

  async create(floorId, payload) {
    return mutateWithOfflineQueue({
      method: 'POST',
      url: `/floors/${floorId}/rooms`,
      data: payload,
      label: `Add room "${payload?.name || 'Room'}"`,
      mockResult: {
        id: `offline-room-${Date.now()}`,
        name: payload?.name,
        floorId,
        measurements: [],
      },
    });
  },

  async update(roomId, payload) {
    return mutateWithOfflineQueue({
      method: 'PATCH',
      url: `/rooms/${roomId}`,
      data: payload,
      label: `Update room "${payload?.name || ''}"`,
      mockResult: { id: roomId, ...payload },
    });
  },

  async remove(roomId) {
    return mutateWithOfflineQueue({
      method: 'DELETE',
      url: `/rooms/${roomId}`,
      label: `Delete room`,
      mockResult: { id: roomId, deleted: true },
    });
  },

  async reorder(floorId, roomIds) {
    const { data } = await apiClient.patch(`/floors/${floorId}/rooms/reorder`, { roomIds });
    return data.data;
  },
};

