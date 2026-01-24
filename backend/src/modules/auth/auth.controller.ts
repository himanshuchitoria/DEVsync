// src/modules/auth/auth.controller.ts
import type { Request, Response } from 'express';
import { User } from '../user/user.model';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signAccessToken } from '../../utils/jwt';
import { logger } from '../../config/logger';

interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  accessToken: string;
}

const validateRegister = (body: any): RegisterRequest | null => {
  const { email, password, displayName } = body;
  
  if (!email || !password || !displayName) {
    return null;
  }
  
  if (typeof email !== 'string' || !email.includes('@')) {
    return null;
  }
  
  if (typeof password !== 'string' || password.length < 8) {
    return null;
  }
  
  if (typeof displayName !== 'string' || displayName.trim().length < 2) {
    return null;
  }
  
  return { email: email.trim(), password: password.trim(), displayName: displayName.trim() };
};

const validateLogin = (body: any): LoginRequest | null => {
  const { email, password } = body;
  
  if (!email || !password) {
    return null;
  }
  
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  
  return { email: email.trim(), password: password.trim() };
};

export const register = async (req: Request, res: Response): Promise<Response<AuthResponse>> => {
  const registerData = validateRegister(req.body);
  
  if (!registerData) {
    return res.status(400).json({ 
      message: 'Valid email, password (min 8 chars), and displayName (min 2 chars) required' 
    });
  }

  try {
    // Check email uniqueness
    const existing = await User.findOne({ email: registerData.email });
    if (existing) {
      logger.warn({ msg: 'Registration attempt with existing email', email: registerData.email });
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create user
    const passwordHash = await hashPassword(registerData.password);
    const user = await User.create({
      email: registerData.email,
      passwordHash,
      displayName: registerData.displayName,
      role: 'user' as const,
    });

    // Generate JWT with complete user data for socket presence
    const accessToken = signAccessToken({
      sub: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    });

    logger.info({ 
      msg: 'User registered', 
      userId: user.id, 
      email: user.email,
      displayName: user.displayName 
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    logger.error({ 
      err: error, 
      msg: 'Registration failed',
      email: registerData?.email 
    });
    return res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<Response<AuthResponse>> => {
  const loginData = validateLogin(req.body);
  
  if (!loginData) {
    return res.status(400).json({ 
      message: 'Valid email and password required' 
    });
  }

  try {
    // Find user
    const user = await User.findOne({ email: loginData.email });
    if (!user) {
      logger.warn({ msg: 'Login failed: user not found', email: loginData.email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(loginData.password, user.passwordHash);
    if (!isValid) {
      logger.warn({ msg: 'Login failed: invalid password', userId: user.id });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT with complete user data for socket presence
    const accessToken = signAccessToken({
      sub: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    });

    logger.info({ 
      msg: 'User logged in', 
      userId: user.id,
      displayName: user.displayName 
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    logger.error({ 
      err: error, 
      msg: 'Login failed',
      email: loginData.email 
    });
    return res.status(500).json({ message: 'Login failed' });
  }
};
