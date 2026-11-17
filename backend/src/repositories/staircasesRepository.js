import { query, withTransaction } from '../config/db.js';

export function mapStaircaseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    buildingId: row.building_id,
    floorId: row.floor_id,
    roomId: row.room_id,
    roomName: row.room_name || null,
    floorName: row.floor_name || null,
    name: row.name,
    isUniformSteps: row.is_uniform_steps,
    treadCount: Number(row.tread_count),
    riserCount: Number(row.riser_count),
    treadWidthFt: Number(row.tread_width_ft),
    treadDepthFt: Number(row.tread_depth_ft),
    riserHeightFt: Number(row.riser_height_ft),
    landingLengthFt: Number(row.landing_length_ft),
    landingWidthFt: Number(row.landing_width_ft),
    skirtingLengthFt: Number(row.skirting_length_ft),
    treadAreaSqft: Number(row.tread_area_sqft),
    riserAreaSqft: Number(row.riser_area_sqft),
    landingAreaSqft: Number(row.landing_area_sqft),
    totalAreaSqft: Number(row.total_area_sqft),
    stepsData: Array.isArray(row.steps_data) ? row.steps_data : [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listStaircasesByRoom(roomId) {
  const { rows } = await query(
    `SELECT s.*, r.name AS room_name, f.name AS floor_name
     FROM staircases s
     JOIN rooms r ON r.id = s.room_id
     JOIN floors f ON f.id = s.floor_id
     WHERE s.room_id = $1 AND r.is_deleted = FALSE AND f.is_deleted = FALSE
     ORDER BY s.created_at DESC`,
    [roomId]
  );
  return rows.map(mapStaircaseRow);
}

export async function listStaircasesByBuilding(buildingId) {
  const { rows } = await query(
    `SELECT s.*, r.name AS room_name, f.name AS floor_name
     FROM staircases s
     JOIN rooms r ON r.id = s.room_id
     JOIN floors f ON f.id = s.floor_id
     WHERE s.building_id = $1 AND r.is_deleted = FALSE AND f.is_deleted = FALSE
     ORDER BY f.display_order ASC, s.created_at DESC`,
    [buildingId]
  );
  return rows.map(mapStaircaseRow);
}

export async function findStaircaseById(id) {
  const { rows } = await query(
    `SELECT s.*, b.owner_id, r.name AS room_name, f.name AS floor_name
     FROM staircases s
     JOIN buildings b ON b.id = s.building_id
     JOIN rooms r ON r.id = s.room_id
     JOIN floors f ON f.id = s.floor_id
     WHERE s.id = $1 AND b.is_deleted = FALSE AND r.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createStaircase(room, calc, name, notes, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO staircases (
         building_id, floor_id, room_id, name, is_uniform_steps,
         tread_count, riser_count, tread_width_ft, tread_depth_ft, riser_height_ft,
         landing_length_ft, landing_width_ft, skirting_length_ft,
         tread_area_sqft, riser_area_sqft, landing_area_sqft, total_area_sqft,
         steps_data, notes
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13,
         $14, $15, $16, $17,
         $18::jsonb, $19
       )
       RETURNING *`,
      [
        room.building_id,
        room.floor_id,
        room.id,
        name,
        calc.isUniformSteps,
        calc.treadCount,
        calc.riserCount,
        calc.treadWidthFt,
        calc.treadDepthFt,
        calc.riserHeightFt,
        calc.landingLengthFt,
        calc.landingWidthFt,
        calc.skirtingLengthFt,
        calc.treadAreaSqft,
        calc.riserAreaSqft,
        calc.landingAreaSqft,
        calc.totalAreaSqft,
        JSON.stringify(calc.stepsData),
        notes || null,
      ]
    );

    const created = rows[0];
    return mapStaircaseRow(created);
  });
}

export async function updateStaircase(id, buildingId, calc, name, notes, userId) {
  const { rows } = await query(
    `UPDATE staircases
     SET
       name = $2,
       is_uniform_steps = $3,
       tread_count = $4,
       riser_count = $5,
       tread_width_ft = $6,
       tread_depth_ft = $7,
       riser_height_ft = $8,
       landing_length_ft = $9,
       landing_width_ft = $10,
       skirting_length_ft = $11,
       tread_area_sqft = $12,
       riser_area_sqft = $13,
       landing_area_sqft = $14,
       total_area_sqft = $15,
       steps_data = $16::jsonb,
       notes = $17
     WHERE id = $1
     RETURNING *`,
    [
      id,
      name,
      calc.isUniformSteps,
      calc.treadCount,
      calc.riserCount,
      calc.treadWidthFt,
      calc.treadDepthFt,
      calc.riserHeightFt,
      calc.landingLengthFt,
      calc.landingWidthFt,
      calc.skirtingLengthFt,
      calc.treadAreaSqft,
      calc.riserAreaSqft,
      calc.landingAreaSqft,
      calc.totalAreaSqft,
      JSON.stringify(calc.stepsData),
      notes || null,
    ]
  );

  return mapStaircaseRow(rows[0]);
}

export async function deleteStaircase(existing, userId) {
  await query(`DELETE FROM staircases WHERE id = $1`, [existing.id]);
}

