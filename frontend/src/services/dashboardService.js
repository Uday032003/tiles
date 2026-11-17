import apiClient from './apiClient.js';

export const dashboardService = {
  async getSummary() {
    const { data } = await apiClient.get('/dashboard/summary');
    return data.data;
  },

  async getCharts() {
    const { data } = await apiClient.get('/dashboard/charts');
    return data.data;
  },
};

