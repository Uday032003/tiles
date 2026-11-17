import { query, withTransaction } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { roundTo } from '../utils/measurementCalculator.js';

export function mapWorkTypeRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    defaultUnit: row.default_unit,
    defaultRate: Number(row.default_rate || 0),
    isSystem: row.is_system,
    displayOrder: Number(row.display_order || 0),
  };
}

export function mapMeasurementRow(row, segments = [], deductions = []) {
  if (!row) return null;
  return {
    id: row.id,
    buildingId: row.building_id,
    buildingName: row.building_name || null,
    buildingCode: row.building_code || null,
    floorId: row.floor_id,
    floorName: row.floor_name || null,
    roomId: row.room_id,
    roomName: row.room_name || null,
    workTypeId: row.work_type_id,
    workTypeCode: row.work_type_code || null,
    workTypeName: row.work_type_name || null,
    workTypeCategory: row.work_type_category || null,
    name: row.name,
    inputMethod: row.input_method,
    dimensionUnit: row.dimension_unit,
    outputUnit: row.output_unit,
    lengthRaw: row.length_raw,
    widthRaw: row.width_raw,
    heightRaw: row.height_raw,
    lengthFt: row.length_ft !== null ? Number(row.length_ft) : null,
    widthFt: row.width_ft !== null ? Number(row.width_ft) : null,
    heightFt: row.height_ft !== null ? Number(row.height_ft) : null,
    quantity: Number(row.quantity || 1),
    directArea: row.direct_area !== null ? Number(row.direct_area) : null,
    grossArea: Number(row.gross_area || 0),
    deductionArea: Number(row.deduction_area || 0),
    netArea: Number(row.net_area || 0),
    billableQuantity: Number(row.billable_quantity || 0),
    surfaceRole: row.surface_role,
    notes: row.notes,
    segments: segments.map((s) => ({
      id: s.id,
      measurementId: s.measurement_id,
      label: s.label,
      dimensionUnit: s.dimension_unit,
      lengthRaw: s.length_raw,
      widthRaw: s.width_raw,
      lengthFt: Number(s.length_ft),
      widthFt: Number(s.width_ft),
      quantity: Number(s.quantity),
      areaSqft: Number(s.area_sqft),
      displayOrder: Number(s.display_order || 0),
    })),
    deductions: deductions.map((d) => ({
      id: d.id,
      measurementId: d.measurement_id,
      label: d.label,
      deductionType: d.deduction_type,
      dimensionUnit: d.dimension_unit,
      lengthRaw: d.length_raw,
      widthRaw: d.width_raw,
      lengthFt: Number(d.length_ft),
      widthFt: Number(d.width_ft),
      quantity: Number(d.quantity),
      areaSqft: Number(d.area_sqft),
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWorkTypes() {
  const { rows } = await query(
    `SELECT * FROM work_types ORDER BY display_order ASC, name ASC`
  );
  return rows.map(mapWorkTypeRow);
}

export async function findWorkTypeById(id) {
  const { rows } = await query(`SELECT * FROM work_types WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}

async function attachChildren(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [segRes, dedRes] = await Promise.all([
    query(
      `SELECT * FROM measurement_segments WHERE measurement_id = ANY($1::uuid[]) ORDER BY display_order ASC, created_at ASC`,
      [ids]
    ),
    query(
      `SELECT * FROM measurement_deductions WHERE measurement_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
      [ids]
    ),
  ]);

  const segMap = new Map();
  for (const seg of segRes.rows) {
    const list = segMap.get(seg.measurement_id) || [];
    list.push(seg);
    segMap.set(seg.measurement_id, list);
  }

  const dedMap = new Map();
  for (const ded of dedRes.rows) {
    const list = dedMap.get(ded.measurement_id) || [];
    list.push(ded);
    dedMap.set(ded.measurement_id, list);
  }

  return rows.map((row) =>
    mapMeasurementRow(row, segMap.get(row.id) || [], dedMap.get(row.id) || [])
  );
}

export async function listMeasurements({
  userId,
  userRole,
  buildingId = null,
  floorId = null,
  roomId = null,
  surfaceRole = null,
  search = '',
  page = 1,
  limit = 50,
}) {
  const params = [];
  const conditions = [
    'm.is_deleted = FALSE',
    'b.is_deleted = FALSE',
    'f.is_deleted = FALSE',
    'r.is_deleted = FALSE',
  ];

  if (userRole === 'ADMIN') {
    params.push(userId);
    conditions.push(`b.owner_id = $${params.length}`);
  } else {
    params.push(userId);
    conditions.push(
      `EXISTS (SELECT 1 FROM building_permissions bp WHERE bp.building_id = b.id AND bp.user_id = $${params.length})`
    );
  }

  if (buildingId) {
    params.push(buildingId);
    conditions.push(`m.building_id = $${params.length}`);
  }
  if (floorId) {
    params.push(floorId);
    conditions.push(`m.floor_id = $${params.length}`);
  }
  if (roomId) {
    params.push(roomId);
    conditions.push(`m.room_id = $${params.length}`);
  }
  if (surfaceRole && surfaceRole !== 'ALL') {
    params.push(surfaceRole);
    conditions.push(`m.surface_role = $${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(m.name ILIKE $${idx} OR r.name ILIKE $${idx} OR wt.name ILIKE $${idx} OR b.name ILIKE $${idx})`
    );
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const countRes = await query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM measurements m
     JOIN buildings b ON b.id = m.building_id
     JOIN floors f ON f.id = m.floor_id
     JOIN rooms r ON r.id = m.room_id
     JOIN work_types wt ON wt.id = m.work_type_id
     WHERE ${whereClause}`,
    params
  );
  const total = countRes.rows[0]?.total || 0;

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT
       m.*,
       b.name AS building_name,
       b.building_code AS building_code,
       f.name AS floor_name,
       r.name AS room_name,
       wt.code AS work_type_code,
       wt.name AS work_type_name,
       wt.category AS work_type_category
     FROM measurements m
     JOIN buildings b ON b.id = m.building_id
     JOIN floors f ON f.id = m.floor_id
     JOIN rooms r ON r.id = m.room_id
     JOIN work_types wt ON wt.id = m.work_type_id
     WHERE ${whereClause}
     ORDER BY m.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const items = await attachChildren(rows);
  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function findMeasurementById(measurementId) {
  const { rows } = await query(
    `SELECT
       m.*,
       b.owner_id,
       b.name AS building_name,
       b.building_code AS building_code,
       f.name AS floor_name,
       r.name AS room_name,
       wt.code AS work_type_code,
       wt.name AS work_type_name,
       wt.category AS work_type_category
     FROM measurements m
     JOIN buildings b ON b.id = m.building_id
     JOIN floors f ON f.id = m.floor_id
     JOIN rooms r ON r.id = m.room_id
     JOIN work_types wt ON wt.id = m.work_type_id
     WHERE m.id = $1 AND m.is_deleted = FALSE AND b.is_deleted = FALSE
     LIMIT 1`,
    [measurementId]
  );
  if (!rows[0]) return null;
  const [hydrated] = await attachChildren(rows);
  return {
    ...hydrated,
    ownerId: rows[0].owner_id,
  };
}

export async function getAreaSummary({ buildingId, floorId = null, roomId = null }) {
  const params = [buildingId];
  const measConds = ['m.building_id = $1', 'm.is_deleted = FALSE', 'f.is_deleted = FALSE', 'r.is_deleted = FALSE'];
  const stairConds = ['s.building_id = $1', 'f.is_deleted = FALSE', 'r.is_deleted = FALSE'];

  if (floorId) {
    params.push(floorId);
    measConds.push(`m.floor_id = $${params.length}`);
    stairConds.push(`s.floor_id = $${params.length}`);
  }
  if (roomId) {
    params.push(roomId);
    measConds.push(`m.room_id = $${params.length}`);
    stairConds.push(`s.room_id = $${params.length}`);
  }

  const [measRes, stairRes] = await Promise.all([
    query(
      `SELECT
         COALESCE(SUM(CASE WHEN m.surface_role = 'FLOOR' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS floor_tiles_sqft,
         COALESCE(SUM(CASE WHEN m.surface_role = 'WALL' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS wall_tiles_sqft,
         COALESCE(SUM(CASE WHEN m.surface_role = 'GRANITE' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS granite_sqft,
         COALESCE(SUM(CASE WHEN m.surface_role = 'STAIRCASE' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS meas_staircase_sqft,
         COALESCE(SUM(CASE WHEN m.surface_role = 'ELEVATION' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS elevation_sqft,
         COALESCE(SUM(CASE WHEN m.surface_role = 'OTHER' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS other_sqft,
         COALESCE(SUM(CASE WHEN m.surface_role = 'SKIRTING' AND m.output_unit = 'RUNNING_FT' THEN m.net_area ELSE 0 END), 0) AS skirting_running_ft,
         COALESCE(SUM(CASE WHEN m.surface_role = 'GRANITE' AND m.output_unit = 'RUNNING_FT' THEN m.net_area ELSE 0 END), 0) AS granite_running_ft,
         COALESCE(SUM(CASE WHEN m.output_unit = 'PIECES' THEN m.net_area ELSE 0 END), 0) AS total_pieces,
         COALESCE(SUM(CASE WHEN m.output_unit = 'FIXED' THEN 1 ELSE 0 END), 0) AS fixed_items_count,
         COALESCE(SUM(CASE WHEN m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END), 0) AS meas_total_sqft
       FROM measurements m
       JOIN floors f ON f.id = m.floor_id
       JOIN rooms r ON r.id = m.room_id
       WHERE ${measConds.join(' AND ')}`,
      params
    ),
    query(
      `SELECT
         COALESCE(SUM(s.total_area_sqft), 0) AS staircase_calc_sqft,
         COALESCE(SUM(s.skirting_length_ft), 0) AS staircase_skirting_ft
       FROM staircases s
       JOIN floors f ON f.id = s.floor_id
       JOIN rooms r ON r.id = s.room_id
       WHERE ${stairConds.join(' AND ')}`,
      params
    ),
  ]);

  const mRow = measRes.rows[0];
  const sRow = stairRes.rows[0];
  const staircaseSqft = roundTo(Number(mRow.meas_staircase_sqft) + Number(sRow.staircase_calc_sqft), 2);
  const totalMeasuredSqft = roundTo(Number(mRow.meas_total_sqft) + Number(sRow.staircase_calc_sqft), 2);

  return {
    floorTilesSqft: roundTo(mRow.floor_tiles_sqft, 2),
    wallTilesSqft: roundTo(mRow.wall_tiles_sqft, 2),
    graniteSqft: roundTo(mRow.granite_sqft, 2),
    staircaseSqft,
    elevationSqft: roundTo(mRow.elevation_sqft, 2),
    otherSqft: roundTo(mRow.other_sqft, 2),
    skirtingRunningFt: roundTo(Number(mRow.skirting_running_ft) + Number(sRow.staircase_skirting_ft), 2),
    graniteRunningFt: roundTo(mRow.granite_running_ft, 2),
    totalPieces: roundTo(mRow.total_pieces, 2),
    fixedItemsCount: Number(mRow.fixed_items_count || 0),
    totalMeasuredSqft,
  };
}

export async function createMeasurement(room, workType, calculated, rawPayload, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO measurements (
         building_id, floor_id, room_id, work_type_id, name,
         input_method, dimension_unit, output_unit,
         length_raw, width_raw, height_raw,
         length_ft, width_ft, height_ft,
         quantity, direct_area, gross_area, deduction_area, net_area,
         billable_quantity, surface_role, notes, created_by, updated_by
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11,
         $12, $13, $14,
         $15, $16, $17, $18, $19,
         $20, $21, $22, $23, $23
       )
       RETURNING id`,
      [
        room.building_id,
        room.floor_id,
        room.id,
        workType.id,
        rawPayload.name,
        rawPayload.inputMethod,
        rawPayload.dimensionUnit,
        rawPayload.outputUnit,
        rawPayload.lengthRaw ?? null,
        rawPayload.widthRaw ?? null,
        rawPayload.heightRaw ?? null,
        calculated.lengthFt,
        calculated.widthFt,
        calculated.heightFt,
        calculated.quantity,
        calculated.directArea,
        calculated.grossArea,
        calculated.deductionArea,
        calculated.netArea,
        calculated.billableQuantity,
        rawPayload.surfaceRole,
        rawPayload.notes || null,
        userId,
      ]
    );

    const measId = rows[0].id;

    for (const seg of calculated.segments) {
      await client.query(
        `INSERT INTO measurement_segments (
           measurement_id, label, dimension_unit, length_raw, width_raw,
           length_ft, width_ft, quantity, area_sqft, display_order
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          measId,
          seg.label,
          seg.dimensionUnit,
          seg.lengthRaw,
          seg.widthRaw,
          seg.lengthFt,
          seg.widthFt,
          seg.quantity,
          seg.areaSqft,
          seg.displayOrder,
        ]
      );
    }

    for (const ded of calculated.deductions) {
      await client.query(
        `INSERT INTO measurement_deductions (
           measurement_id, label, deduction_type, dimension_unit, length_raw, width_raw,
           length_ft, width_ft, quantity, area_sqft
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          measId,
          ded.label,
          ded.deductionType,
          ded.dimensionUnit,
          ded.lengthRaw,
          ded.widthRaw,
          ded.lengthFt,
          ded.widthFt,
          ded.quantity,
          ded.areaSqft,
        ]
      );
    }

    await client.query(
      `INSERT INTO measurement_history (measurement_id, changed_by, previous_data, new_data, change_note)
       VALUES ($1, $2, NULL, $3::jsonb, $4)`,
      [measId, userId, JSON.stringify({ ...rawPayload, ...calculated }), 'Initial measurement created']
    );

    return measId;
  }).then((measId) => findMeasurementById(measId));
}

export async function updateMeasurement(existing, workType, calculated, rawPayload, userId) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE measurements
       SET
         work_type_id = $2,
         name = $3,
         input_method = $4,
         dimension_unit = $5,
         output_unit = $6,
         length_raw = $7,
         width_raw = $8,
         height_raw = $9,
         length_ft = $10,
         width_ft = $11,
         height_ft = $12,
         quantity = $13,
         direct_area = $14,
         gross_area = $15,
         deduction_area = $16,
         net_area = $17,
         billable_quantity = $18,
         surface_role = $19,
         notes = $20,
         updated_by = $21
       WHERE id = $1 AND is_deleted = FALSE`,
      [
        existing.id,
        workType.id,
        rawPayload.name,
        rawPayload.inputMethod,
        rawPayload.dimensionUnit,
        rawPayload.outputUnit,
        rawPayload.lengthRaw ?? null,
        rawPayload.widthRaw ?? null,
        rawPayload.heightRaw ?? null,
        calculated.lengthFt,
        calculated.widthFt,
        calculated.heightFt,
        calculated.quantity,
        calculated.directArea,
        calculated.grossArea,
        calculated.deductionArea,
        calculated.netArea,
        calculated.billableQuantity,
        rawPayload.surfaceRole,
        rawPayload.notes || null,
        userId,
      ]
    );

    await client.query(`DELETE FROM measurement_segments WHERE measurement_id = $1`, [existing.id]);
    for (const seg of calculated.segments) {
      await client.query(
        `INSERT INTO measurement_segments (
           measurement_id, label, dimension_unit, length_raw, width_raw,
           length_ft, width_ft, quantity, area_sqft, display_order
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          existing.id,
          seg.label,
          seg.dimensionUnit,
          seg.lengthRaw,
          seg.widthRaw,
          seg.lengthFt,
          seg.widthFt,
          seg.quantity,
          seg.areaSqft,
          seg.displayOrder,
        ]
      );
    }

    await client.query(`DELETE FROM measurement_deductions WHERE measurement_id = $1`, [existing.id]);
    for (const ded of calculated.deductions) {
      await client.query(
        `INSERT INTO measurement_deductions (
           measurement_id, label, deduction_type, dimension_unit, length_raw, width_raw,
           length_ft, width_ft, quantity, area_sqft
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          existing.id,
          ded.label,
          ded.deductionType,
          ded.dimensionUnit,
          ded.lengthRaw,
          ded.widthRaw,
          ded.lengthFt,
          ded.widthFt,
          ded.quantity,
          ded.areaSqft,
        ]
      );
    }

    await client.query(
      `INSERT INTO measurement_history (measurement_id, changed_by, previous_data, new_data, change_note)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)`,
      [
        existing.id,
        userId,
        JSON.stringify({
          name: existing.name,
          grossArea: existing.grossArea,
          deductionArea: existing.deductionArea,
          netArea: existing.netArea,
          billableQuantity: existing.billableQuantity,
        }),
        JSON.stringify({ ...rawPayload, ...calculated }),
        rawPayload.changeNote || 'Measurement updated',
      ]
    );
  }).then(() => findMeasurementById(existing.id));
}

export async function duplicateMeasurement(existing, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO measurements (
         building_id, floor_id, room_id, work_type_id, name,
         input_method, dimension_unit, output_unit,
         length_raw, width_raw, height_raw,
         length_ft, width_ft, height_ft,
         quantity, direct_area, gross_area, deduction_area, net_area,
         billable_quantity, surface_role, notes, created_by, updated_by
       )
       SELECT
         building_id, floor_id, room_id, work_type_id, name || ' (Copy)',
         input_method, dimension_unit, output_unit,
         length_raw, width_raw, height_raw,
         length_ft, width_ft, height_ft,
         quantity, direct_area, gross_area, deduction_area, net_area,
         billable_quantity, surface_role, notes, $2, $2
       FROM measurements
       WHERE id = $1 AND is_deleted = FALSE
       RETURNING id`,
      [existing.id, userId]
    );
    const newId = rows[0].id;

    await client.query(
      `INSERT INTO measurement_segments (
         measurement_id, label, dimension_unit, length_raw, width_raw,
         length_ft, width_ft, quantity, area_sqft, display_order
       )
       SELECT $1, label, dimension_unit, length_raw, width_raw,
              length_ft, width_ft, quantity, area_sqft, display_order
       FROM measurement_segments WHERE measurement_id = $2`,
      [newId, existing.id]
    );

    await client.query(
      `INSERT INTO measurement_deductions (
         measurement_id, label, deduction_type, dimension_unit, length_raw, width_raw,
         length_ft, width_ft, quantity, area_sqft
       )
       SELECT $1, label, deduction_type, dimension_unit, length_raw, width_raw,
              length_ft, width_ft, quantity, area_sqft
       FROM measurement_deductions WHERE measurement_id = $2`,
      [newId, existing.id]
    );

    return newId;
  }).then((newId) => findMeasurementById(newId));
}

export async function softDeleteMeasurement(existing, userId) {
  await query(
    `UPDATE measurements SET is_deleted = TRUE, updated_by = $2 WHERE id = $1`,
    [existing.id, userId]
  );
}

export async function addSegmentToMeasurement(measurement, segCalc, segInput, userId) {
  if (measurement.inputMethod !== 'SEGMENTS') {
    throw ApiError.badRequest('Segments can only be added to multiple-segment measurements');
  }
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM measurement_segments WHERE measurement_id = $1`,
      [measurement.id]
    );
    await client.query(
      `INSERT INTO measurement_segments (
         measurement_id, label, dimension_unit, length_raw, width_raw,
         length_ft, width_ft, quantity, area_sqft, display_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        measurement.id,
        segInput.label,
        segInput.dimensionUnit,
        segInput.lengthRaw,
        segInput.widthRaw,
        segCalc.lengthFt,
        segCalc.widthFt,
        segCalc.quantity,
        segCalc.areaSqft,
        orderRes.rows[0].next_order,
      ]
    );

    const newGross = roundTo(measurement.grossArea + segCalc.areaSqft, 4);
    const newNet = roundTo(newGross - measurement.deductionArea, 4);
    await client.query(
      `UPDATE measurements
       SET gross_area = $2, net_area = $3, billable_quantity = $3, updated_by = $4
       WHERE id = $1`,
      [measurement.id, newGross, newNet, userId]
    );
  }).then(() => findMeasurementById(measurement.id));
}

export async function findSegmentById(segmentId) {
  const { rows } = await query(`SELECT * FROM measurement_segments WHERE id = $1 LIMIT 1`, [segmentId]);
  return rows[0] || null;
}

export async function findDeductionById(deductionId) {
  const { rows } = await query(`SELECT * FROM measurement_deductions WHERE id = $1 LIMIT 1`, [deductionId]);
  return rows[0] || null;
}

export async function removeSegment(segmentId, userId) {
  const segRes = await query(`SELECT * FROM measurement_segments WHERE id = $1 LIMIT 1`, [segmentId]);
  const seg = segRes.rows[0];
  if (!seg) throw ApiError.notFound('Segment not found');

  const meas = await findMeasurementById(seg.measurement_id);
  if (!meas) throw ApiError.notFound('Parent measurement not found');

  const newGross = roundTo(Math.max(0, meas.grossArea - Number(seg.area_sqft)), 4);
  if (meas.deductionArea > newGross) {
    throw ApiError.badRequest(
      'Cannot remove segment because remaining gross area would be less than existing deductions'
    );
  }

  return withTransaction(async (client) => {
    await client.query(`DELETE FROM measurement_segments WHERE id = $1`, [segmentId]);
    const newNet = roundTo(newGross - meas.deductionArea, 4);
    await client.query(
      `UPDATE measurements
       SET gross_area = $2, net_area = $3, billable_quantity = $3, updated_by = $4
       WHERE id = $1`,
      [meas.id, newGross, newNet, userId]
    );
  }).then(() => findMeasurementById(meas.id));
}

export async function addDeductionToMeasurement(measurement, dedCalc, dedInput, userId) {
  if (measurement.outputUnit !== 'SQ_FT') {
    throw ApiError.badRequest('Deductions are only supported for square-foot measurements');
  }
  const newDeductionArea = roundTo(measurement.deductionArea + dedCalc.areaSqft, 4);
  if (newDeductionArea > measurement.grossArea) {
    throw ApiError.badRequest(
      `Deduction exceeds gross area (${newDeductionArea} > ${measurement.grossArea} sq ft)`
    );
  }

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO measurement_deductions (
         measurement_id, label, deduction_type, dimension_unit, length_raw, width_raw,
         length_ft, width_ft, quantity, area_sqft
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        measurement.id,
        dedInput.label,
        dedInput.deductionType || 'OPENING',
        dedInput.dimensionUnit,
        dedInput.lengthRaw,
        dedInput.widthRaw,
        dedCalc.lengthFt,
        dedCalc.widthFt,
        dedCalc.quantity,
        dedCalc.areaSqft,
      ]
    );
    const newNet = roundTo(measurement.grossArea - newDeductionArea, 4);
    await client.query(
      `UPDATE measurements
       SET deduction_area = $2, net_area = $3, billable_quantity = $3, updated_by = $4
       WHERE id = $1`,
      [measurement.id, newDeductionArea, newNet, userId]
    );
  }).then(() => findMeasurementById(measurement.id));
}

export async function removeDeduction(deductionId, userId) {
  const dedRes = await query(`SELECT * FROM measurement_deductions WHERE id = $1 LIMIT 1`, [deductionId]);
  const ded = dedRes.rows[0];
  if (!ded) throw ApiError.notFound('Deduction not found');

  const meas = await findMeasurementById(ded.measurement_id);
  if (!meas) throw ApiError.notFound('Parent measurement not found');

  return withTransaction(async (client) => {
    await client.query(`DELETE FROM measurement_deductions WHERE id = $1`, [deductionId]);
    const newDeductionArea = roundTo(Math.max(0, meas.deductionArea - Number(ded.area_sqft)), 4);
    const newNet = roundTo(meas.grossArea - newDeductionArea, 4);
    await client.query(
      `UPDATE measurements
       SET deduction_area = $2, net_area = $3, billable_quantity = $3, updated_by = $4
       WHERE id = $1`,
      [meas.id, newDeductionArea, newNet, userId]
    );
  }).then(() => findMeasurementById(meas.id));
}

export async function getMeasurementHistory(measurementId) {
  const { rows } = await query(
    `SELECT mh.*, u.full_name AS changed_by_name
     FROM measurement_history mh
     LEFT JOIN users u ON u.id = mh.changed_by
     WHERE mh.measurement_id = $1
     ORDER BY mh.created_at DESC`,
    [measurementId]
  );
  return rows.map((r) => ({
    id: r.id,
    measurementId: r.measurement_id,
    changedBy: r.changed_by,
    changedByName: r.changed_by_name || 'System',
    previousData: r.previous_data,
    newData: r.new_data,
    changeNote: r.change_note,
    createdAt: r.created_at,
  }));
}
