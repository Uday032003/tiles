export function sendSuccess(res, { message = 'OK', data = null, meta = null, statusCode = 200 } = {}) {
  const payload = {
    success: true,
    message,
    data,
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function sendCreated(res, { message = 'Created successfully', data = null } = {}) {
  return sendSuccess(res, { message, data, statusCode: 201 });
}

