// src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

interface EnvConfig {
  nodeEnv: NodeEnv;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  clientOrigin: string; // for CORS and Socket.IO origin later
}

const getEnvVar = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const nodeEnv = (process.env.NODE_ENV as NodeEnv) || 'development';

export const env: EnvConfig = {
  nodeEnv,
  port: Number(process.env.PORT) || 4000,
  mongoUri: getEnvVar('MONGO_URI'),
  jwtSecret: getEnvVar('JWT_SECRET'),
  clientOrigin: getEnvVar('CLIENT_ORIGIN', 'http://localhost:3000'),
};
