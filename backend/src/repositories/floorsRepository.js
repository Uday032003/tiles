import { query, withTransaction } from '../config/db.js';

export function mapFloorRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    buildingId: row.building_id,
    floorNumber: Number(row.floor_number),
    name: row.name,
    displayOrder: Number(row.display_order),
    notes: row.notes,
    roomCount: Number(row.room_count || 0),
    floorTileArea: Number(row.floor_tile_area || 0),
    wallTileArea: Number(row.wall_tile_area || 0),
    graniteArea: Number(row.granite_area || 0),
    totalMeasuredArea: Number(row.total_measured_area || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFloorsByBuilding(buildingId) {
  const { rows } = await query(
    `SELECT
       f.*,
       COALESCE(rm.room_count, 0) AS room_count,
       COALESCE(ms.floor_tile_area, 0) AS floor_tile_area,
       COALESCE(ms.wall_tile_area, 0) AS wall_tile_area,
       COALESCE(ms.granite_area, 0) AS granite_area,
       COALESCE(ms.total_measured_area, 0) AS total_measured_area
     FROM floors f
     LEFT JOIN (
       SELECT floor_id, COUNT(*)::INTEGER AS room_count
       FROM rooms WHERE is_deleted = FALSE GROUP BY floor_id
     ) rm ON rm.floor_id = f.id
     LEFT JOIN (
       SELECT
         floor_id,
         SUM(CASE WHEN surface_role = 'FLOOR' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS floor_tile_area,
         SUM(CASE WHEN surface_role = 'WALL' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS wall_tile_area,
         SUM(CASE WHEN surface_role = 'GRANITE' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS granite_area,
         SUM(CASE WHEN output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS total_measured_area
       FROM measurements WHERE is_deleted = FALSE GROUP BY floor_id
     ) ms ON ms.floor_id = f.id
     WHERE f.building_id = $1 AND f.is_deleted = FALSE
     ORDER BY f.display_order ASC, f.floor_number ASC, f.created_at ASC`,
    [buildingId]
  );
  return rows.map(mapFloorRow);
}

export async function findFloorById(floorId) {
  const { rows } = await query(
    `SELECT f.*, b.owner_id, b.name AS building_name
     FROM floors f
     JOIN buildings b ON b.id = f.building_id
     WHERE f.id = $1 AND f.is_deleted = FALSE AND b.is_deleted = FALSE
     LIMIT 1`,
    [floorId]
  );
  return rows[0] || null;
}

export async function createFloor(buildingId, userId, data) {
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
       FROM floors WHERE building_id = $1 AND is_deleted = FALSE`,
      [buildingId]
    );
    const nextOrder = data.displayOrder ?? orderRes.rows[0].next_order;

    const { rows } = await client.query(
      `INSERT INTO floors (building_id, floor_number, name, display_order, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [buildingId, data.floorNumber ?? nextOrder, data.name, nextOrder, data.notes || null]
    );

    const created = rows[0];
    return mapFloorRow(created);
  });
}

export async function updateFloor(floorId, data) {
  const fieldMap = {
    name: 'name',
    floorNumber: 'floor_number',
    displayOrder: 'display_order',
    notes: 'notes',
  };
  const setClauses = [];
  const params = [floorId];

  for (const [dtoKey, colName] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(data, dtoKey) && data[dtoKey] !== undefined) {
      params.push(data[dtoKey] === '' ? null : data[dtoKey]);
      setClauses.push(`${colName} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    const existing = await findFloorById(floorId);
    return mapFloorRow(existing);
  }

  const { rows } = await query(
    `UPDATE floors SET ${setClauses.join(', ')} WHERE id = $1 AND is_deleted = FALSE RETURNING *`,
    params
  );
  return mapFloorRow(rows[0]);
}

export async function softDeleteFloor(floorId, buildingId, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE floors SET is_deleted = TRUE WHERE id = $1 AND is_deleted = FALSE RETURNING id, name`,
      [floorId]
    );

    if (rows.length === 0) {
      return null;
    }

    // Cascade soft delete to rooms and measurements
    await client.query(`UPDATE rooms SET is_deleted = TRUE WHERE floor_id = $1`, [floorId]);
    await client.query(`UPDATE measurements SET is_deleted = TRUE WHERE floor_id = $1`, [floorId]);
    await client.query(`DELETE FROM staircases WHERE floor_id = $1`, [floorId]);

    return rows[0];
  });
}

export async function reorderFloors(buildingId, floorIds) {
  return withTransaction(async (client) => {
    for (let i = 0; i < floorIds.length; i += 1) {
      await client.query(
        `UPDATE floors SET display_order = $1 WHERE id = $2 AND building_id = $3 AND is_deleted = FALSE`,
        [i, floorIds[i], buildingId]
      );
    }
  });
}

export async function duplicateFloor(sourceFloor, { name, floorNumber, copyMeasurements = true }, userId) {
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
       FROM floors WHERE building_id = $1 AND is_deleted = FALSE`,
      [sourceFloor.building_id]
    );
    const nextOrder = orderRes.rows[0].next_order;

    const floorRes = await client.query(
      `INSERT INTO floors (building_id, floor_number, name, display_order, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        sourceFloor.building_id,
        floorNumber ?? Number(sourceFloor.floor_number) + 1,
        name || `${sourceFloor.name} (Copy)`,
        nextOrder,
        sourceFloor.notes,
      ]
    );
    const newFloor = floorRes.rows[0];

    const roomsRes = await client.query(
      `SELECT * FROM rooms WHERE floor_id = $1 AND is_deleted = FALSE ORDER BY display_order ASC`,
      [sourceFloor.id]
    );

    for (const srcRoom of roomsRes.rows) {
      const newRoomRes = await client.query(
        `INSERT INTO rooms (floor_id, room_type_id, name, display_order, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newFloor.id, srcRoom.room_type_id, srcRoom.name, srcRoom.display_order, srcRoom.notes]
      );
      const newRoom = newRoomRes.rows[0];

      if (copyMeasurements) {
        const measRes = await client.query(
          `SELECT * FROM measurements WHERE room_id = $1 AND is_deleted = FALSE`,
          [srcRoom.id]
        );

        for (const srcMeas of measRes.rows) {
          const newMeasRes = await client.query(
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
              newFloor.building_id,
              newFloor.id,
              newRoom.id,
              srcMeas.work_type_id,
              srcMeas.name,
              srcMeas.input_method,
              srcMeas.dimension_unit,
              srcMeas.output_unit,
              srcMeas.length_raw,
              srcMeas.width_raw,
              srcMeas.height_raw,
              srcMeas.length_ft,
              srcMeas.width_ft,
              srcMeas.height_ft,
              srcMeas.quantity,
              srcMeas.direct_area,
              srcMeas.gross_area,
              srcMeas.deduction_area,
              srcMeas.net_area,
              srcMeas.billable_quantity,
              srcMeas.surface_role,
              srcMeas.notes,
              userId,
            ]
          );
          const newMeasId = newMeasRes.rows[0].id;

          await client.query(
            `INSERT INTO measurement_segments (
               measurement_id, label, dimension_unit, length_raw, width_raw,
               length_ft, width_ft, quantity, area_sqft, display_order
             )
             SELECT $1, label, dimension_unit, length_raw, width_raw,
                    length_ft, width_ft, quantity, area_sqft, display_order
             FROM measurement_segments
             WHERE measurement_id = $2`,
            [newMeasId, srcMeas.id]
          );

          await client.query(
            `INSERT INTO measurement_deductions (
               measurement_id, label, deduction_type, dimension_unit, length_raw, width_raw,
               length_ft, width_ft, quantity, area_sqft
             )
             SELECT $1, label, deduction_type, dimension_unit, length_raw, width_raw,
                    length_ft, width_ft, quantity, area_sqft
             FROM measurement_deductions
             WHERE measurement_id = $2`,
            [newMeasId, srcMeas.id]
          );
        }
      }
    }

    return mapFloorRow(newFloor);
  });
}

