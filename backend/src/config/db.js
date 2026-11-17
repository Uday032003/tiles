import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not configured.');
    }
    const isCloudDb = Boolean(
      env.databaseUrl &&
      (env.dbSsl ||
       env.databaseUrl.includes('render.com') ||
       env.databaseUrl.includes('supabase.co') ||
       env.databaseUrl.includes('neon.tech') ||
       env.databaseUrl.includes('pooler.supabase.com') ||
       env.databaseUrl.includes('sslmode=require'))
    );

    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: isCloudDb ? { rejectUnauthorized: false } : false,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err.message);
    });
  }
  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDbConnection() {
  if (!env.databaseUrl) {
    return { ok: false, message: 'DATABASE_URL not set' };
  }
  try {
    const res = await query('SELECT NOW() AS server_time');
    return { ok: true, serverTime: res.rows[0].server_time };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

