// lib/api/middleware.ts
// API middleware for consistent error handling and validation

import type { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError, AuthenticationError, AuthorizationError } from '../errors';
import { supabase } from '../supabaseClient';

export interface ApiHandler<T = any> {
  (req: NextApiRequest, res: NextApiResponse): Promise<void>;
}

// HTTP method validation middleware
export const withMethods = (allowedMethods: string[]) => {
  return (handler: ApiHandler): ApiHandler => {
    return async (req, res) => {
      if (!req.method || !allowedMethods.includes(req.method)) {
        return res.status(405).json({
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`
          }
        });
      }
      return handler(req, res);
    };
  };
};

// Authentication middleware
export const withAuth = (handler: ApiHandler): ApiHandler => {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Missing or invalid authorization header');
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        throw new AuthenticationError('Invalid token');
      }

      // Add user to request for downstream handlers
      (req as any).user = user;
      return handler(req, res);
    } catch (error) {
      const apiError = handleApiError(error, 'Authentication failed');
      return res.status(apiError.statusCode || 401).json({ error: apiError });
    }
  };
};

// Admin authorization middleware
export const withAdminAuth = (handler: ApiHandler): ApiHandler => {
  return withAuth(async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Check if user has admin role
      const { data: profileUser, error } = await supabase
        .from('profile_users')
        .select('*, roles(name)')
        .eq('user_id', user.id)
        .single();

      if (error || !profileUser) {
        throw new AuthenticationError('User profile not found');
      }

      const role = (profileUser as any).roles?.name;
      if (role !== 'admin' && role !== 'super_admin') {
        throw new AuthorizationError('Admin access required');
      }

      (req as any).profileUser = profileUser;
      return handler(req, res);
    } catch (error) {
      const apiError = handleApiError(error, 'Authorization failed');
      return res.status(apiError.statusCode || 403).json({ error: apiError });
    }
  });
};

// Error handling wrapper
export const withErrorHandling = (handler: ApiHandler): ApiHandler => {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const apiError = handleApiError(error, 'Internal server error');
      return res.status(apiError.statusCode || 500).json({ error: apiError });
    }
  };
};

// Validation middleware
export const withValidation = (validator: (body: any) => { isValid: boolean; errors: string[] }) => {
  return (handler: ApiHandler): ApiHandler => {
    return async (req, res) => {
      const validation = validator(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        });
      }
      return handler(req, res);
    };
  };
};

// Combine multiple middlewares
export const composeMiddleware = (...middlewares: ((handler: ApiHandler) => ApiHandler)[]) => {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
};