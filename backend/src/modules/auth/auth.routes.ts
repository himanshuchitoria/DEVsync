// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { login, register } from './auth.controller';

export const authRouter = Router();

// Public routes: registration and login.
authRouter.post('/register', register);
authRouter.post('/login', login);
