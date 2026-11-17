import { query } from '../config/db.js';

const PUBLIC_USER_COLUMNS = `
  id, full_name, email, phone, role, is_active, last_login_at, created_at, updated_at
`;

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserWithPasswordById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}, password_hash FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ fullName, email, phone = null, passwordHash, role = 'ADMIN' }) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, LOWER($2), $3, $4, $5)
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [fullName, email, phone, passwordHash, role]
  );
  return rows[0];
}

export async function updateUserProfile(id, { fullName, phone }) {
  const { rows } = await query(
    `UPDATE users
     SET full_name = COALESCE($2, full_name),
         phone = COALESCE($3, phone)
     WHERE id = $1
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [id, fullName ?? null, phone ?? null]
  );
  return rows[0] || null;
}

export async function updateUserPassword(id, passwordHash) {
  await query(
    `UPDATE users
     SET password_hash = $2,
         reset_token_hash = NULL,
         reset_token_expires_at = NULL
     WHERE id = $1`,
    [id, passwordHash]
  );
}

export async function recordLastLogin(id) {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
}

export async function saveResetToken(id, tokenHash, expiresAt) {
  await query(
    `UPDATE users
     SET reset_token_hash = $2,
         reset_token_expires_at = $3
     WHERE id = $1`,
    [id, tokenHash, expiresAt]
  );
}

export async function findUserByValidResetToken(tokenHash) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM users
     WHERE reset_token_hash = $1
       AND reset_token_expires_at > NOW()
       AND is_active = TRUE
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

