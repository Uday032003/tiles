import { z } from 'zod';

export function uuidParamSchema(paramName = 'id') {
  return z.object({
    [paramName]: z.string().uuid(`Invalid ${paramName}`),
  });
}

