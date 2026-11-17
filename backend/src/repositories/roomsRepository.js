import { query, withTransaction } from '../config/db.js';

export function mapRoomRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    floorId: row.floor_id,
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name || null,
    roomTypeCategory: row.room_type_category || null,
    name: row.name,
    displayOrder: Number(row.display_order),
    notes: row.notes,
    measurementCount: Number(row.measurement_count || 0),
    floorTileArea: Number(row.floor_tile_area || 0),
    wallTileArea: Number(row.wall_tile_area || 0),
    graniteArea: Number(row.granite_area || 0),
    totalMeasuredArea: Number(row.total_measured_area || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRoomTypes() {
  const { rows } = await query(
    `SELECT id, name, category, default_has_floor_tiles, default_has_wall_tiles, is_system, display_order
     FROM room_types
     ORDER BY display_order ASC, name ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    defaultHasFloorTiles: r.default_has_floor_tiles,
    defaultHasWallTiles: r.default_has_wall_tiles,
    isSystem: r.is_system,
    displayOrder: Number(r.display_order),
  }));
}

export async function listRoomsByFloor(floorId) {
  const { rows } = await query(
    `SELECT
       r.*,
       rt.name AS room_type_name,
       rt.category AS room_type_category,
       COALESCE(ms.measurement_count, 0) AS measurement_count,
       COALESCE(ms.floor_tile_area, 0) AS floor_tile_area,
       COALESCE(ms.wall_tile_area, 0) AS wall_tile_area,
       COALESCE(ms.granite_area, 0) AS granite_area,
       COALESCE(ms.total_measured_area, 0) AS total_measured_area
     FROM rooms r
     LEFT JOIN room_types rt ON rt.id = r.room_type_id
     LEFT JOIN (
       SELECT
         room_id,
         COUNT(*)::INTEGER AS measurement_count,
         SUM(CASE WHEN surface_role = 'FLOOR' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS floor_tile_area,
         SUM(CASE WHEN surface_role = 'WALL' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS wall_tile_area,
         SUM(CASE WHEN surface_role = 'GRANITE' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS granite_area,
         SUM(CASE WHEN output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS total_measured_area
       FROM measurements
       WHERE is_deleted = FALSE
       GROUP BY room_id
     ) ms ON ms.room_id = r.id
     WHERE r.floor_id = $1 AND r.is_deleted = FALSE
     ORDER BY r.display_order ASC, r.created_at ASC`,
    [floorId]
  );
  return rows.map(mapRoomRow);
}

export async function findRoomById(roomId) {
  const { rows } = await query(
    `SELECT
       r.*,
       rt.name AS room_type_name,
       rt.category AS room_type_category,
       f.building_id,
       f.name AS floor_name,
       b.owner_id
     FROM rooms r
     JOIN floors f ON f.id = r.floor_id
     JOIN buildings b ON b.id = f.building_id
     LEFT JOIN room_types rt ON rt.id = r.room_type_id
     WHERE r.id = $1
       AND r.is_deleted = FALSE
       AND f.is_deleted = FALSE
       AND b.is_deleted = FALSE
     LIMIT 1`,
    [roomId]
  );
  return rows[0] || null;
}

export async function createRoom(floorId, buildingId, userId, data) {
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
       FROM rooms WHERE floor_id = $1 AND is_deleted = FALSE`,
      [floorId]
    );
    const nextOrder = data.displayOrder ?? orderRes.rows[0].next_order;

    const { rows } = await client.query(
      `INSERT INTO rooms (floor_id, room_type_id, name, display_order, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [floorId, data.roomTypeId || null, data.name, nextOrder, data.notes || null]
    );

    const createdId = rows[0].id;

    const fullRes = await client.query(
      `SELECT r.*, rt.name AS room_type_name, rt.category AS room_type_category
       FROM rooms r LEFT JOIN room_types rt ON rt.id = r.room_type_id
       WHERE r.id = $1`,
      [createdId]
    );
    return mapRoomRow(fullRes.rows[0]);
  });
}

export async function updateRoom(roomId, data) {
  const fieldMap = {
    name: 'name',
    roomTypeId: 'room_type_id',
    displayOrder: 'display_order',
    notes: 'notes',
  };
  const setClauses = [];
  const params = [roomId];

  for (const [dtoKey, colName] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(data, dtoKey) && data[dtoKey] !== undefined) {
      params.push(data[dtoKey] === '' ? null : data[dtoKey]);
      setClauses.push(`${colName} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return mapRoomRow(await findRoomById(roomId));
  }

  await query(`UPDATE rooms SET ${setClauses.join(', ')} WHERE id = $1 AND is_deleted = FALSE`, params);
  return mapRoomRow(await findRoomById(roomId));
}

export async function softDeleteRoom(roomId, buildingId, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE rooms SET is_deleted = TRUE WHERE id = $1 AND is_deleted = FALSE RETURNING id, name`,
      [roomId]
    );

    if (rows.length === 0) {
      return null;
    }

    // Cascade soft delete to measurements
    await client.query(`UPDATE measurements SET is_deleted = TRUE WHERE room_id = $1`, [roomId]);
    await client.query(`DELETE FROM staircases WHERE room_id = $1`, [roomId]);

    return rows[0];
  });
}

export async function reorderRooms(floorId, roomIds) {
  return withTransaction(async (client) => {
    for (let i = 0; i < roomIds.length; i += 1) {
      await client.query(
        `UPDATE rooms SET display_order = $1 WHERE id = $2 AND floor_id = $3 AND is_deleted = FALSE`,
        [i, roomIds[i], floorId]
      );
    }
  });
}

