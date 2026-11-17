import { query } from '../config/db.js';
import { roundTo } from '../utils/measurementCalculator.js';

function buildAccessFilter(user, alias = 'b', startIdx = 1) {
  if (user.role === 'ADMIN') {
    return {
      clause: `${alias}.owner_id = $${startIdx}`,
      params: [user.id],
    };
  }
  return {
    clause: `EXISTS (SELECT 1 FROM building_permissions bp WHERE bp.building_id = ${alias}.id AND bp.user_id = $${startIdx})`,
    params: [user.id],
  };
}

export async function getDashboardSummary(user) {
  const access = buildAccessFilter(user, 'b', 1);

  const [bldRes, measRes, stairRes] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::INTEGER AS total_buildings
       FROM buildings b
       WHERE b.is_deleted = FALSE AND ${access.clause}`,
      access.params
    ),
    query(
      `SELECT
         COALESCE(SUM(CASE WHEN m.surface_role = 'FLOOR' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS floor_tile_area,
         COALESCE(SUM(CASE WHEN m.surface_role = 'WALL' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS wall_tile_area,
         COALESCE(SUM(CASE WHEN m.surface_role = 'GRANITE' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS granite_area,
         COALESCE(SUM(CASE WHEN m.surface_role = 'STAIRCASE' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS meas_staircase_area,
         COALESCE(SUM(CASE WHEN m.surface_role IN ('ELEVATION', 'OTHER') AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS other_area,
         COALESCE(SUM(CASE WHEN m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS meas_total_area
       FROM measurements m
       JOIN buildings b ON b.id = m.building_id
       JOIN floors f ON f.id = m.floor_id
       JOIN rooms r ON r.id = m.room_id
       WHERE m.is_deleted = FALSE
         AND b.is_deleted = FALSE
         AND f.is_deleted = FALSE
         AND r.is_deleted = FALSE
         AND ${access.clause}`,
      access.params
    ),
    query(
      `SELECT COALESCE(SUM(s.total_area_sqft), 0) AS staircase_calc_area
       FROM staircases s
       JOIN buildings b ON b.id = s.building_id
       JOIN floors f ON f.id = s.floor_id
       JOIN rooms r ON r.id = s.room_id
       WHERE b.is_deleted = FALSE
         AND f.is_deleted = FALSE
         AND r.is_deleted = FALSE
         AND ${access.clause}`,
      access.params
    ),
  ]);

  const bRow = bldRes.rows[0];
  const mRow = measRes.rows[0];
  const sRow = stairRes.rows[0];

  const totalFloorTileArea = roundTo(mRow.floor_tile_area, 2);
  const totalWallTileArea = roundTo(mRow.wall_tile_area, 2);
  const totalGraniteArea = roundTo(mRow.granite_area, 2);
  const totalStaircaseArea = roundTo(Number(mRow.meas_staircase_area) + Number(sRow.staircase_calc_area), 2);
  const totalOtherArea = roundTo(mRow.other_area, 2);
  const totalMeasuredArea = roundTo(Number(mRow.meas_total_area) + Number(sRow.staircase_calc_area), 2);

  return {
    totalBuildings: bRow.total_buildings,
    totalFloorTileArea,
    totalWallTileArea,
    totalGraniteArea,
    totalStaircaseArea,
    totalOtherArea,
    totalMeasuredArea,
  };
}

export async function getDashboardCharts(user) {
  const summary = await getDashboardSummary(user);

  return {
    areaComparison: [
      { key: 'floor', label: 'Floor Tiles', value: summary.totalFloorTileArea, color: '#2563eb' },
      { key: 'wall', label: 'Wall Tiles', value: summary.totalWallTileArea, color: '#0ea5e9' },
      { key: 'granite', label: 'Granite', value: summary.totalGraniteArea, color: '#ea580c' },
      { key: 'staircase', label: 'Staircases', value: summary.totalStaircaseArea, color: '#8b5cf6' },
      { key: 'other', label: 'Elevation & Other', value: summary.totalOtherArea, color: '#64748b' },
    ],
  };
}

