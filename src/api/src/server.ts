import Fastify from 'fastify';

import { buildApp } from './fastify-app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await buildApp(config, {}, Fastify);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
