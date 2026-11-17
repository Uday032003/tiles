import { ApiError } from '../utils/apiError.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { generateResetToken, hashResetToken, signAccessToken } from '../utils/jwt.js';
import * as usersRepo from '../repositories/usersRepository.js';
import { env } from '../config/env.js';

export function formatUserDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export async function register({ fullName, email, phone, password }) {
  const existing = await usersRepo.findUserByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await usersRepo.createUser({
    fullName,
    email,
    phone,
    passwordHash,
    role: 'ADMIN',
  });

  const token = signAccessToken(user);
  return {
    token,
    user: formatUserDto(user),
  };
}

export async function login({ email, password }) {
  const userRecord = await usersRepo.findUserByEmail(email);
  if (!userRecord) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!userRecord.is_active) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  const isMatch = await comparePassword(password, userRecord.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  await usersRepo.recordLastLogin(userRecord.id);
  const token = signAccessToken(userRecord);

  return {
    token,
    user: formatUserDto(userRecord),
  };
}

export async function getProfile(userId) {
  const user = await usersRepo.findUserById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return formatUserDto(user);
}

export async function updateProfile(userId, { fullName, phone }) {
  const updated = await usersRepo.updateUserProfile(userId, { fullName, phone });
  if (!updated) {
    throw ApiError.notFound('User not found');
  }
  return formatUserDto(updated);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const userRecord = await usersRepo.findUserWithPasswordById(userId);
  if (!userRecord) {
    throw ApiError.notFound('User not found');
  }

  const isMatch = await comparePassword(currentPassword, userRecord.password_hash);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from your current password');
  }

  const newHash = await hashPassword(newPassword);
  await usersRepo.updateUserPassword(userId, newHash);
}

export async function forgotPassword({ email }) {
  const userRecord = await usersRepo.findUserByEmail(email);
  if (!userRecord || !userRecord.is_active) {
    // Always return generic confirmation to prevent account enumeration
    return { sent: true };
  }

  const { rawToken, tokenHash } = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await usersRepo.saveResetToken(userRecord.id, tokenHash, expiresAt);

  if (!env.isProd && !env.isTest) {
    console.info(`[DEV Password Reset Token for ${userRecord.email}]: ${rawToken}`);
  }

  return {
    sent: true,
    // Never return raw token in production; only in development convenience when no email provider is configured
    ...(env.nodeEnv === 'development' ? { devResetToken: rawToken } : {}),
  };
}

export async function resetPassword({ token, newPassword }) {
  const tokenHash = hashResetToken(token);
  const user = await usersRepo.findUserByValidResetToken(tokenHash);
  if (!user) {
    throw ApiError.badRequest('Password reset token is invalid or has expired');
  }

  const newHash = await hashPassword(newPassword);
  await usersRepo.updateUserPassword(user.id, newHash);
}

