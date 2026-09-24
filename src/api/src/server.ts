import Fastify from 'fastify';

import { buildApp } from './fastify-app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await buildApp(config, {}, Fastify);

export default app;
