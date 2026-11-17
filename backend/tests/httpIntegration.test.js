import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import app from '../src/app.js';
import { authenticate, authorizeRoles } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { signAccessToken } from '../src/utils/jwt.js';

async function withServer(expressApp, fn) {
  const server = await new Promise((resolve) => {
    const s = expressApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('Main Express app enforces 404, unauthenticated 401, tampered JWT 401, and Zod 400 validation', async () => {
  await withServer(app, async (baseUrl) => {
    // 1. Unknown route returns structured 404
    const notFoundRes = await fetch(`${baseUrl}/api/v1/nonexistent-endpoint`);
    assert.equal(notFoundRes.status, 404);
    const notFoundBody = await notFoundRes.json();
    assert.equal(notFoundBody.success, false);

    // 2. Protected route without token returns 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/buildings`);
    assert.equal(unauthRes.status, 401);

    // 3. Protected route with tampered token returns 401
    const badJwtRes = await fetch(`${baseUrl}/api/v1/buildings`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert.equal(badJwtRes.status, 401);

    // 4. Auth endpoints reject malformed inputs with 400 before hitting DB
    const badRegisterRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'A', email: 'not-an-email', password: '123' }),
    });
    assert.equal(badRegisterRes.status, 400);
    const badRegBody = await badRegisterRes.json();
    assert.equal(badRegBody.success, false);
    assert.ok(Array.isArray(badRegBody.details));

    const badLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad', password: '' }),
    });
    assert.equal(badLoginRes.status, 400);
  });
});

test('HTTP RBAC pipeline denies STAFF access (403) and grants ADMIN access (200) with mocked user lookup', async () => {
  const rbacApp = express();
  rbacApp.use(express.json());
  rbacApp.get(
    '/admin-only',
    (req, res, next) => {
      const auth = req.headers.authorization || '';
      if (auth.includes('staff-token')) {
        req.user = { id: 'u2', role: 'STAFF' };
        return next();
      }
      if (auth.includes('admin-token')) {
        req.user = { id: 'u1', role: 'ADMIN' };
        return next();
      }
      return authenticate(req, res, next);
    },
    authorizeRoles('ADMIN'),
    (_req, res) => res.json({ success: true })
  );
  rbacApp.use(errorHandler);

  await withServer(rbacApp, async (baseUrl) => {
    const token = signAccessToken({ sub: 'u2', email: 's@test.local', role: 'STAFF' });
    assert.ok(token);

    const staffRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: 'Bearer staff-token' },
    });
    assert.equal(staffRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(adminRes.status, 200);
  });
});

test('All controller-to-service method references resolve to exported functions', async () => {
  const ctrlDir = path.resolve('src/controllers');
  const files = fs.readdirSync(ctrlDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const src = fs.readFileSync(path.join(ctrlDir, file), 'utf8');
    const importRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](\.\.\/services\/[^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(src)) !== null) {
      const [, alias, relPath] = m;
      const svc = await import(new URL(relPath, pathToFileURL(path.join(ctrlDir, file))).href);
      const callRegex = new RegExp(`\\b${alias}\\.(\\w+)\\s*\\(`, 'g');
      let cm;
      while ((cm = callRegex.exec(src)) !== null) {
        const fnName = cm[1];
        assert.equal(
          typeof svc[fnName],
          'function',
          `${file} references ${alias}.${fnName}(), which is not an exported function`
        );
      }
    }
  }
});
