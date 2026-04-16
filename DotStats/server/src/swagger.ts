import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

export async function setupSwagger(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'DotStats Analytics API',
        description: 'DotTranslator 配套数据分析平台 API\n\n认证：\n- 事件接收需 `INGEST_API_KEY`（Header: `x-api-key`）\n- 管理接口需 `ADMIN_API_KEY`（Header: `x-admin-key`）',
        version: '0.2.0',
        contact: { name: 'DotTranslator', url: 'https://github.com/wjpyinuo/DotTranslator' },
        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
      },
      servers: [
        { url: 'http://localhost:3000', description: '本地开发' },
      ],
      tags: [
        { name: 'Events', description: '遥测事件接收' },
        { name: 'Stats', description: '统计数据查询' },
        { name: 'Admin', description: '管理接口（需认证）' },
        { name: 'Health', description: '健康检查' },
      ],
      components: {
        securitySchemes: {
          ingestApiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
          adminApiKey: { type: 'apiKey', in: 'header', name: 'x-admin-key' },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}
