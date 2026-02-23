import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Fastify, {} from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { registerRoutes } from './routes.js';
import { registerAuth } from './auth.js';
export async function createServer(config, options = {}) {
    const { logger = true } = options;
    const app = Fastify({
        logger: logger
            ? {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname',
                    },
                },
            }
            : false,
    });
    // Enable CORS for admin UI
    await app.register(cors, {
        origin: true,
        credentials: true,
    });
    // Multipart for file uploads (10MB limit)
    await app.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    });
    // Serve uploaded files
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
    }
    await app.register(fastifyStatic, {
        root: uploadsDir,
        prefix: '/uploads/',
    });
    // Register auth middleware if configured
    if (options.auth) {
        registerAuth(app, options.auth);
    }
    await registerRoutes(app, config, options.hooks, options.access, options.auth);
    return app;
}
export async function startServer(app, options = {}) {
    const { port = 4000, host = '0.0.0.0' } = options;
    await app.listen({ port, host });
}
//# sourceMappingURL=server.js.map