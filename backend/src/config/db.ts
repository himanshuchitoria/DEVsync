// src/config/db.ts
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

mongoose.set('strictQuery', true);

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.mongoUri, {
      // dbName: 'evsync', // optional if not in URI
    });
    logger.info({ msg: `MongoDB connected (${env.nodeEnv})` });
  } catch (error) {
    logger.error({ err: error, msg: 'MongoDB connection error' });
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info({ msg: 'MongoDB disconnected' });
};
