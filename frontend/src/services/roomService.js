import apiClient from './apiClient.js';

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
    const { data } = await apiClient.post(`/floors/${floorId}/rooms`, payload);
    return data.data;
  },

  async update(roomId, payload) {
    const { data } = await apiClient.patch(`/rooms/${roomId}`, payload);
    return data.data;
  },

  async remove(roomId) {
    const { data } = await apiClient.delete(`/rooms/${roomId}`);
    return data.data;
  },

  async reorder(floorId, roomIds) {
    const { data } = await apiClient.patch(`/floors/${floorId}/rooms/reorder`, { roomIds });
    return data.data;
  },
};

