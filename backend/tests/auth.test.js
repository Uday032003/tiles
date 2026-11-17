import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import { hashPassword, comparePassword } from '../src/utils/password.js';
import {
  signAccessToken,
  verifyAccessToken,
  generateResetToken,
  hashResetToken,
} from '../src/utils/jwt.js';
import { createAuthenticateMiddleware, authorizeRoles } from '../src/middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
} from '../src/validators/authValidator.js';
import { formatUserDto } from '../src/services/authService.js';

test('hashPassword and comparePassword verify valid and reject invalid passwords', async () => {
  const hash = await hashPassword('Contractor@123');
  assert.notEqual(hash, 'Contractor@123');
  assert.equal(await comparePassword('Contractor@123', hash), true);
  assert.equal(await comparePassword('WrongPassword', hash), false);
});

test('signAccessToken and verifyAccessToken roundtrip user claims', () => {
  const token = signAccessToken({ id: 'user-uuid-1', email: 'owner@dmtiles.in', role: 'ADMIN' });
  const decoded = verifyAccessToken(token);
  assert.equal(decoded.sub, 'user-uuid-1');
  assert.equal(decoded.email, 'owner@dmtiles.in');
  assert.equal(decoded.role, 'ADMIN');
});

test('generateResetToken hashes deterministically via hashResetToken', () => {
  const { rawToken, tokenHash } = generateResetToken();
  assert.equal(rawToken.length, 64);
  assert.equal(hashResetToken(rawToken), tokenHash);
});

test('formatUserDto excludes sensitive fields like password_hash', () => {
  const dto = formatUserDto({
    id: 'u1',
    full_name: 'Ramesh',
    email: 'ramesh@dmtiles.in',
    phone: '9876543210',
    role: 'ADMIN',
    is_active: true,
    password_hash: 'secret-bcrypt-hash',
    reset_token_hash: 'secret-reset',
  });
  assert.equal(dto.fullName, 'Ramesh');
  assert.equal('password_hash' in dto, false);
  assert.equal('reset_token_hash' in dto, false);
});

test('registerSchema and changePasswordSchema enforce strong inputs', () => {
  const validReg = registerSchema.safeParse({
    fullName: 'Srinivas Rao',
    email: 'srinivas@example.com',
    phone: '',
    password: 'Password123',
  });
  assert.equal(validReg.success, true);
  assert.equal(validReg.data.phone, null);

  const shortPwd = registerSchema.safeParse({
    fullName: 'Srinivas',
    email: 'srinivas@example.com',
    password: '123',
  });
  assert.equal(shortPwd.success, false);

  const validLogin = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' });
  assert.equal(validLogin.success, true);

  const invalidChange = changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'short' });
  assert.equal(invalidChange.success, false);

  const invalidReset = resetPasswordSchema.safeParse({ token: 'short', newPassword: 'Password123' });
  assert.equal(invalidReset.success, false);
});

test('authenticate middleware populates req.user and authorizeRoles enforces RBAC', async () => {
  const fakeUser = { id: 'u-123', email: 'staff@dmtiles.in', role: 'STAFF', is_active: true };
  const authenticate = createAuthenticateMiddleware(async (id) => (id === 'u-123' ? fakeUser : null));
  const token = signAccessToken(fakeUser);

  const req = { headers: { authorization: `Bearer ${token}` } };
  let nextErr = null;
  await authenticate(req, {}, (err) => {
    nextErr = err || null;
  });
  assert.equal(nextErr, null);
  assert.deepEqual(req.user, fakeUser);

  // Role check failure
  let roleErr = null;
  authorizeRoles('ADMIN')(req, {}, (err) => {
    roleErr = err || null;
  });
  assert.equal(roleErr?.statusCode, 403);

  // Role check success
  let roleOkErr = null;
  authorizeRoles('ADMIN', 'STAFF')(req, {}, (err) => {
    roleOkErr = err || null;
  });
  assert.equal(roleOkErr, null);
});

