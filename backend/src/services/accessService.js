import { query } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Verifies that the authenticated user can access the given building.
 * ADMIN owners have full access to their own buildings.
 * STAFF users require an explicit row in building_permissions with the requested flag.
 */
export async function requireBuildingAccess(buildingId, user, permissionFlag = null) {
  const { rows } = await query(
    `SELECT id, owner_id, is_deleted
     FROM buildings
     WHERE id = $1 AND is_deleted = FALSE
     LIMIT 1`,
    [buildingId]
  );

  let building = rows[0];
  if (!building) {
    // If no building matched directly, check if the ID belongs to a floor
    const { rows: floorRows } = await query(
      `SELECT building_id FROM floors WHERE id = $1 AND is_deleted = FALSE LIMIT 1`,
      [buildingId]
    );
    if (floorRows[0]) {
      return requireBuildingAccess(floorRows[0].building_id, user, permissionFlag);
    }
    throw ApiError.notFound('Building not found');
  }

  if (user.role === 'ADMIN' && building.owner_id === user.id) {
    return { building, isOwner: true, permissions: null };
  }

  if (user.role === 'STAFF') {
    const permRes = await query(
      `SELECT * FROM building_permissions WHERE building_id = $1 AND user_id = $2 LIMIT 1`,
      [buildingId, user.id]
    );
    const perm = permRes.rows[0];
    if (!perm) {
      throw ApiError.forbidden('You do not have access to this building');
    }
    if (permissionFlag && !perm[permissionFlag]) {
      throw ApiError.forbidden('You do not have permission for this operation');
    }
    return { building, isOwner: false, permissions: perm };
  }

  throw ApiError.forbidden('You do not have access to this building');
}

