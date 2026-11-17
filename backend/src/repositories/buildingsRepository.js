import { query, withTransaction } from '../config/db.js';
import { mapFloorRow } from './floorsRepository.js';
import { mapRoomRow } from './roomsRepository.js';
import { mapMeasurementRow } from './measurementsRepository.js';

const SORT_COLUMN_MAP = {
  created_at: 'b.created_at',
  updated_at: 'b.updated_at',
  name: 'b.name',
  total_area: 'total_measured_area',
};

export function mapBuildingRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    buildingCode: row.building_code,
    name: row.name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    location: row.location,
    address: row.address,
    description: row.description,
    startDate: row.start_date,
    expectedCompletionDate: row.expected_completion_date,
    actualCompletionDate: row.actual_completion_date,
    completionRemarks: row.completion_remarks,
    notes: row.notes,
    floorCount: Number(row.floor_count || 0),
    roomCount: Number(row.room_count || 0),
    floorTileArea: Number(row.floor_tile_area || 0),
    wallTileArea: Number(row.wall_tile_area || 0),
    graniteArea: Number(row.granite_area || 0),
    totalMeasuredArea: Number(row.total_measured_area || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function generateBuildingCode(client) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(building_code FROM 'BLD-([0-9]+)') AS INTEGER)), 1000) AS max_num
     FROM buildings`
  );
  const nextNum = Number(rows[0]?.max_num || 1000) + 1;
  return `BLD-${nextNum}`;
}

export async function listBuildings({
  userId,
  userRole,
  search = '',
  sortBy = 'updated_at',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
}) {
  const params = [];
  const conditions = ['b.is_deleted = FALSE'];

  if (userRole === 'ADMIN') {
    params.push(userId);
    conditions.push(`b.owner_id = $${params.length}`);
  } else {
    params.push(userId);
    conditions.push(
      `EXISTS (SELECT 1 FROM building_permissions bp WHERE bp.building_id = b.id AND bp.user_id = $${params.length})`
    );
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const idx = params.length;
    conditions.push(
      `(b.name ILIKE $${idx} OR b.customer_name ILIKE $${idx} OR b.location ILIKE $${idx} OR b.building_code ILIKE $${idx})`
    );
  }

  const whereClause = conditions.join(' AND ');
  const sortExpr = SORT_COLUMN_MAP[sortBy] || 'b.updated_at';
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const countRes = await query(
    `SELECT COUNT(*)::INTEGER AS total FROM buildings b WHERE ${whereClause}`,
    params
  );
  const total = countRes.rows[0]?.total || 0;

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const { rows } = await query(
    `SELECT
       b.*,
       COALESCE(fl.floor_count, 0) AS floor_count,
       COALESCE(rm.room_count, 0) AS room_count,
       COALESCE(ms.floor_tile_area, 0) AS floor_tile_area,
       COALESCE(ms.wall_tile_area, 0) AS wall_tile_area,
       COALESCE(ms.granite_area, 0) AS granite_area,
       COALESCE(ms.total_measured_area, 0) AS total_measured_area
     FROM buildings b
     LEFT JOIN (
       SELECT building_id, COUNT(*)::INTEGER AS floor_count
       FROM floors
       WHERE is_deleted = FALSE
       GROUP BY building_id
     ) fl ON fl.building_id = b.id
     LEFT JOIN (
       SELECT f.building_id, COUNT(r.id)::INTEGER AS room_count
       FROM rooms r
       JOIN floors f ON f.id = r.floor_id
       WHERE r.is_deleted = FALSE AND f.is_deleted = FALSE
       GROUP BY f.building_id
     ) rm ON rm.building_id = b.id
     LEFT JOIN (
       SELECT
         m.building_id,
         SUM(CASE WHEN m.surface_role = 'FLOOR' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS floor_tile_area,
         SUM(CASE WHEN m.surface_role = 'WALL' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS wall_tile_area,
         SUM(CASE WHEN m.surface_role = 'GRANITE' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS granite_area,
         SUM(CASE WHEN m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS total_measured_area
       FROM measurements m
       JOIN floors f ON f.id = m.floor_id AND f.is_deleted = FALSE
       JOIN rooms r ON r.id = m.room_id AND r.is_deleted = FALSE
       WHERE m.is_deleted = FALSE
       GROUP BY m.building_id
     ) ms ON ms.building_id = b.id
     WHERE ${whereClause}
     ORDER BY ${sortExpr} ${dir}, b.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return {
    items: rows.map(mapBuildingRow),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function findBuildingDetailsById(buildingId) {
  const { rows } = await query(
    `SELECT
       b.*,
       COALESCE(fl.floor_count, 0) AS floor_count,
       COALESCE(rm.room_count, 0) AS room_count,
       COALESCE(ms.floor_tile_area, 0) AS floor_tile_area,
       COALESCE(ms.wall_tile_area, 0) AS wall_tile_area,
       COALESCE(ms.granite_area, 0) AS granite_area,
       COALESCE(ms.total_measured_area, 0) AS total_measured_area
     FROM buildings b
     LEFT JOIN (
       SELECT building_id, COUNT(*)::INTEGER AS floor_count
       FROM floors WHERE is_deleted = FALSE GROUP BY building_id
     ) fl ON fl.building_id = b.id
     LEFT JOIN (
       SELECT f.building_id, COUNT(r.id)::INTEGER AS room_count
       FROM rooms r JOIN floors f ON f.id = r.floor_id
       WHERE r.is_deleted = FALSE AND f.is_deleted = FALSE GROUP BY f.building_id
     ) rm ON rm.building_id = b.id
     LEFT JOIN (
       SELECT
         m.building_id,
         SUM(CASE WHEN m.surface_role = 'FLOOR' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS floor_tile_area,
         SUM(CASE WHEN m.surface_role = 'WALL' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS wall_tile_area,
         SUM(CASE WHEN m.surface_role = 'GRANITE' AND m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS granite_area,
         SUM(CASE WHEN m.output_unit = 'SQ_FT' THEN m.net_area ELSE 0 END) AS total_measured_area
       FROM measurements m
       JOIN floors f ON f.id = m.floor_id AND f.is_deleted = FALSE
       JOIN rooms r ON r.id = m.room_id AND r.is_deleted = FALSE
       WHERE m.is_deleted = FALSE
       GROUP BY m.building_id
     ) ms ON ms.building_id = b.id
     WHERE b.id = $1 AND b.is_deleted = FALSE
     LIMIT 1`,
    [buildingId]
  );

  return mapBuildingRow(rows[0]);
}

export async function createBuilding(ownerId, data) {
  return withTransaction(async (client) => {
    const buildingCode = await generateBuildingCode(client);
    const { rows } = await client.query(
      `INSERT INTO buildings (
         owner_id, building_code, name, customer_name, customer_phone,
         location, address, description, start_date, expected_completion_date,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        ownerId,
        buildingCode,
        data.name,
        data.customerName,
        data.customerPhone || null,
        data.location,
        data.address || null,
        data.description || null,
        data.startDate || null,
        data.expectedCompletionDate || null,
        data.notes || null,
      ]
    );

    const created = rows[0];

    // Initialize layout if requested
    if (data.initialLayout && data.initialLayout !== 'NONE') {
      const layoutFloors =
        data.initialLayout === 'TWO_FLOOR'
          ? [
              {
                name: 'Ground Floor',
                floorNumber: 0,
                rooms: ['Hall', 'Master Bedroom', 'Kitchen', 'Master Bathroom', 'Parking'],
              },
              {
                name: '1st Floor',
                floorNumber: 1,
                rooms: ['Living Area', 'Master Bedroom', 'Children Bedroom', 'Children Bathroom', 'Balcony'],
              },
            ]
          : [
              {
                name: 'Ground Floor',
                floorNumber: 0,
                rooms: [
                  'Hall',
                  'Kitchen',
                  'Master Bedroom',
                  'Master Bathroom',
                  'Children Bedroom',
                  'Children Bathroom',
                  'Parking',
                ],
              },
            ];

      for (let fIdx = 0; fIdx < layoutFloors.length; fIdx++) {
        const f = layoutFloors[fIdx];
        const floorRes = await client.query(
          `INSERT INTO floors (building_id, name, floor_number, display_order)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [created.id, f.name, f.floorNumber, fIdx]
        );
        const floorId = floorRes.rows[0].id;

        for (let rIdx = 0; rIdx < f.rooms.length; rIdx++) {
          const roomName = f.rooms[rIdx];
          await client.query(
            `INSERT INTO rooms (floor_id, name, display_order)
             VALUES ($1, $2, $3)`,
            [floorId, roomName, rIdx]
          );
        }
      }
    }

    return mapBuildingRow(created);
  });
}

export async function getBuildingTree(buildingId) {
  const building = await findBuildingDetailsById(buildingId);
  if (!building) return null;

  const { rows: floorRows } = await query(
    `SELECT f.*,
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
       SELECT floor_id,
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

  const { rows: roomRows } = await query(
    `SELECT r.*,
            rt.name AS room_type_name,
            rt.category AS room_type_category,
            COALESCE(ms.measurement_count, 0) AS measurement_count,
            COALESCE(ms.floor_tile_area, 0) AS floor_tile_area,
            COALESCE(ms.wall_tile_area, 0) AS wall_tile_area,
            COALESCE(ms.granite_area, 0) AS granite_area,
            COALESCE(ms.total_measured_area, 0) AS total_measured_area
     FROM rooms r
     JOIN floors f ON f.id = r.floor_id
     LEFT JOIN room_types rt ON rt.id = r.room_type_id
     LEFT JOIN (
       SELECT room_id,
              COUNT(*)::INTEGER AS measurement_count,
              SUM(CASE WHEN surface_role = 'FLOOR' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS floor_tile_area,
              SUM(CASE WHEN surface_role = 'WALL' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS wall_tile_area,
              SUM(CASE WHEN surface_role = 'GRANITE' AND output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS granite_area,
              SUM(CASE WHEN output_unit = 'SQ_FT' THEN net_area ELSE 0 END) AS total_measured_area
       FROM measurements WHERE is_deleted = FALSE GROUP BY room_id
     ) ms ON ms.room_id = r.id
     WHERE f.building_id = $1 AND r.is_deleted = FALSE AND f.is_deleted = FALSE
     ORDER BY r.display_order ASC, r.created_at ASC`,
    [buildingId]
  );

  const { rows: measRows } = await query(
    `SELECT m.*,
            wt.name AS work_type_name,
            wt.code AS work_type_code,
            wt.category AS work_type_category,
            wt.default_unit
     FROM measurements m
     JOIN floors f ON f.id = m.floor_id AND f.is_deleted = FALSE
     JOIN rooms r ON r.id = m.room_id AND r.is_deleted = FALSE
     LEFT JOIN work_types wt ON wt.id = m.work_type_id
     WHERE m.building_id = $1 AND m.is_deleted = FALSE
     ORDER BY m.created_at ASC`,
    [buildingId]
  );

  const measurementsByRoom = new Map();
  for (const m of measRows) {
    if (!measurementsByRoom.has(m.room_id)) {
      measurementsByRoom.set(m.room_id, []);
    }
    measurementsByRoom.get(m.room_id).push(mapMeasurementRow(m));
  }

  const roomsByFloor = new Map();
  for (const r of roomRows) {
    if (!roomsByFloor.has(r.floor_id)) {
      roomsByFloor.set(r.floor_id, []);
    }
    const mappedRoom = mapRoomRow(r);
    mappedRoom.measurements = measurementsByRoom.get(r.id) || [];
    roomsByFloor.get(r.floor_id).push(mappedRoom);
  }

  const floors = floorRows.map((f) => {
    const mappedFloor = mapFloorRow(f);
    mappedFloor.rooms = roomsByFloor.get(f.id) || [];
    return mappedFloor;
  });

  return {
    building,
    floors,
  };
}

export async function initBuildingLayout(buildingId, layout = 'STANDARD_RESIDENTIAL') {
  return withTransaction(async (client) => {
    const layoutFloors =
      layout === 'TWO_FLOOR'
        ? [
            {
              name: 'Ground Floor',
              floorNumber: 0,
              rooms: ['Hall', 'Master Bedroom', 'Kitchen', 'Master Bathroom', 'Parking'],
            },
            {
              name: '1st Floor',
              floorNumber: 1,
              rooms: ['Living Area', 'Master Bedroom', 'Children Bedroom', 'Children Bathroom', 'Balcony'],
            },
          ]
        : [
            {
              name: 'Ground Floor',
              floorNumber: 0,
              rooms: [
                'Hall',
                'Kitchen',
                'Master Bedroom',
                'Master Bathroom',
                'Children Bedroom',
                'Children Bathroom',
                'Parking',
              ],
            },
          ];

    for (let fIdx = 0; fIdx < layoutFloors.length; fIdx++) {
      const f = layoutFloors[fIdx];
      const existingFloor = await client.query(
        `SELECT id FROM floors WHERE building_id = $1 AND LOWER(TRIM(name)) = LOWER($2) AND is_deleted = FALSE LIMIT 1`,
        [buildingId, f.name]
      );

      let floorId;
      if (existingFloor.rows.length > 0) {
        floorId = existingFloor.rows[0].id;
      } else {
        const floorRes = await client.query(
          `INSERT INTO floors (building_id, name, floor_number, display_order)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [buildingId, f.name, f.floorNumber, fIdx]
        );
        floorId = floorRes.rows[0].id;
      }

      for (let rIdx = 0; rIdx < f.rooms.length; rIdx++) {
        const roomName = f.rooms[rIdx];
        const existingRoom = await client.query(
          `SELECT id FROM rooms WHERE floor_id = $1 AND LOWER(TRIM(name)) = LOWER($2) AND is_deleted = FALSE LIMIT 1`,
          [floorId, roomName]
        );
        if (existingRoom.rows.length === 0) {
          await client.query(
            `INSERT INTO rooms (floor_id, name, display_order)
             VALUES ($1, $2, $3)`,
            [floorId, roomName, rIdx]
          );
        }
      }
    }

    return getBuildingTree(buildingId);
  });
}

export async function updateBuilding(buildingId, userId, data) {
  const fieldMap = {
    name: 'name',
    customerName: 'customer_name',
    customerPhone: 'customer_phone',
    location: 'location',
    address: 'address',
    description: 'description',
    startDate: 'start_date',
    expectedCompletionDate: 'expected_completion_date',
    notes: 'notes',
  };

  const setClauses = [];
  const params = [buildingId];

  for (const [dtoKey, colName] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(data, dtoKey) && data[dtoKey] !== undefined) {
      params.push(data[dtoKey] === '' ? null : data[dtoKey]);
      setClauses.push(`${colName} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findBuildingDetailsById(buildingId);
  }

  const { rows } = await query(
    `UPDATE buildings
     SET ${setClauses.join(', ')}
     WHERE id = $1 AND is_deleted = FALSE
     RETURNING id`,
    params
  );

  return rows[0] ? await findBuildingDetailsById(rows[0].id) : null;
}

export async function softDeleteBuilding(buildingId, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE buildings
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE id = $1 AND is_deleted = FALSE
       RETURNING id, name, building_code`,
      [buildingId]
    );

    if (rows.length === 0) {
      return null;
    }

    await client.query(`UPDATE floors SET is_deleted = TRUE WHERE building_id = $1`, [buildingId]);
    await client.query(
      `UPDATE rooms SET is_deleted = TRUE WHERE floor_id IN (SELECT id FROM floors WHERE building_id = $1)`,
      [buildingId]
    );
    await client.query(`UPDATE measurements SET is_deleted = TRUE WHERE building_id = $1`, [buildingId]);
    await client.query(`DELETE FROM staircases WHERE building_id = $1`, [buildingId]);

    return rows[0];
  });
}
