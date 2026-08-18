'use client';
import { createAuthGuard } from '@nexus/web';
import { useAuth } from '@/lib/auth';

export const AuthGuard = createAuthGuard(useAuth);