import type { FastifyInstance } from 'fastify';
export declare function setupWebSocket(app: FastifyInstance): Promise<void>;
export declare function broadcastEvent(event: Record<string, unknown>): Promise<void>;
