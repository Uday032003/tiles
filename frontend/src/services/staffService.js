import apiClient from './apiClient.js';

export const staffService = {
  async listStaff() {
    const { data } = await apiClient.get('/staff');
    return data.data;
  },

  async createStaff(payload) {
    const { data } = await apiClient.post('/staff', payload);
    return data.data;
  },

  async listBuildingPermissions(buildingId) {
    const { data } = await apiClient.get(`/buildings/${buildingId}/permissions`);
    return data.data;
  },

  async upsertBuildingPermission(buildingId, payload) {
    const { data } = await apiClient.put(`/buildings/${buildingId}/permissions`, payload);
    return data.data;
  },

  async revokeBuildingPermission(buildingId, userId) {
    const { data } = await apiClient.delete(`/buildings/${buildingId}/permissions/${userId}`);
    return data.data;
  },
};

