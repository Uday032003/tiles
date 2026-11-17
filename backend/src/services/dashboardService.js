import * as dashboardRepo from '../repositories/dashboardRepository.js';

export async function getSummary(user) {
  return dashboardRepo.getDashboardSummary(user);
}

export async function getCharts(user) {
  return dashboardRepo.getDashboardCharts(user);
}

