import * as authService from '../services/authService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return sendCreated(res, {
      message: 'Account registered successfully',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return sendSuccess(res, {
      message: 'Logged in successfully',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function logout(_req, res) {
  return sendSuccess(res, {
    message: 'Logged out successfully',
    data: null,
  });
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, {
      message: 'Profile retrieved successfully',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Password changed successfully',
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    return sendSuccess(res, {
      message: 'If an account with that email exists, password reset instructions have been generated.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body);
    return sendSuccess(res, {
      message: 'Password has been reset successfully. You can now log in.',
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

