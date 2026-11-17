import * as dashboardService from '../services/dashboardService.js';
import { sendSuccess } from '../utils/response.js';

export async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getSummary(req.user);
    return sendSuccess(res, {
      message: 'Dashboard summary retrieved successfully',
      data: summary,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getCharts(req, res, next) {
  try {
    const charts = await dashboardService.getCharts(req.user);
    return sendSuccess(res, {
      message: 'Dashboard charts retrieved successfully',
      data: charts,
    });
  } catch (err) {
    return next(err);
  }
}

