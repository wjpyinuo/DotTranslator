import type { FastifyReply } from 'fastify';

/**
 * Unified error response format for all API endpoints.
 * Always returns: { statusCode, error, message, details? }
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  details?: unknown,
): FastifyReply {
  const body: Record<string, unknown> = {
    statusCode,
    error: getHttpStatusText(statusCode),
    message,
  };
  if (details !== undefined) body.details = details;
  return reply.status(statusCode).send(body);
}

function getHttpStatusText(code: number): string {
  const map: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };
  return map[code] || 'Error';
}
