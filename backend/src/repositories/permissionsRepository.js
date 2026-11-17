import { query, withTransaction } from '../config/db.js';

export function mapStaffUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapPermissionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    buildingId: row.building_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    isActive: row.is_active,
    canViewMeasurements: Boolean(row.can_view_measurements),
    canEditMeasurements: Boolean(row.can_edit_measurements),
    updatedAt: row.updated_at,
  };
}

export async function listStaffUsers() {
  const { rows } = await query(
    `SELECT id, full_name, email, phone, role, is_active, created_at
     FROM users
     WHERE role = 'STAFF'
     ORDER BY created_at DESC`
  );
  return rows.map(mapStaffUserRow);
}

export async function findStaffUserById(userId) {
  const { rows } = await query(
    `SELECT id, full_name, email, phone, role, is_active, created_at
     FROM users
     WHERE id = $1 AND role = 'STAFF'
     LIMIT 1`,
    [userId]
  );
  return rows[0] ? mapStaffUserRow(rows[0]) : null;
}

export async function createStaffUser({ fullName, email, phone, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, 'STAFF', TRUE)
     RETURNING id, full_name, email, phone, role, is_active, created_at`,
    [fullName, email.toLowerCase(), phone || null, passwordHash]
  );
  return mapStaffUserRow(rows[0]);
}

export async function listBuildingPermissions(buildingId) {
  const { rows } = await query(
    `SELECT
       bp.*,
       u.full_name,
       u.email,
       u.phone,
       u.is_active
     FROM building_permissions bp
     JOIN users u ON u.id = bp.user_id
     WHERE bp.building_id = $1
     ORDER BY u.full_name ASC`,
    [buildingId]
  );
  return rows.map(mapPermissionRow);
}

export async function upsertBuildingPermission(buildingId, targetUserId, flags, actorUserId) {
  await query(
    `INSERT INTO building_permissions (
       building_id, user_id,
       can_view_measurements, can_edit_measurements
     )
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (building_id, user_id)
     DO UPDATE SET
       can_view_measurements = EXCLUDED.can_view_measurements,
       can_edit_measurements = EXCLUDED.can_edit_measurements`,
    [
      buildingId,
      targetUserId,
      Boolean(flags.canViewMeasurements),
      Boolean(flags.canEditMeasurements),
    ]
  );

  return listBuildingPermissions(buildingId);
}

export async function revokeBuildingPermission(buildingId, targetUserId, actorUserId) {
  await query(
    `DELETE FROM building_permissions WHERE building_id = $1 AND user_id = $2`,
    [buildingId, targetUserId]
  );

  return { buildingId, userId: targetUserId, removed: true };
}

