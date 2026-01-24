// src/middlewares/cors.ts
import type { CorsOptions } from 'cors';
import { env } from '../config/env';

// Single-origin for now (frontend), easy to extend to array later.
const allowedOrigins = [env.clientOrigin];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools (no Origin header) like cURL/Postman in dev.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // ready for httpOnly cookies if you choose that later.
  optionsSuccessStatus: 204,
};
