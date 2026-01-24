// src/utils/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10; // adjust later if needed for security/perf balance. [web:214][web:215]

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const verifyPassword = async (
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, passwordHash);
};
