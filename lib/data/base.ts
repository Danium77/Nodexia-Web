// lib/data/base.ts
import { supabase } from '../supabaseClient';
import { handleSupabaseError, ApplicationError, logError } from '../errors';
import type { ApiResponse } from '@/types';

export type DatabaseError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

export type DataResult<T> = {
  data: T | null;
  error: DatabaseError | null;
};

export type PaginatedResult<T> = {
  data: T[];
  error: DatabaseError | null;
  count: number | null;
  hasMore: boolean;
};

/**
 * Base query builder for consistent error handling and response formatting
 */
export class BaseQuery {
  /**
   * Execute a query with consistent error handling
   */
  static async execute<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>
  ): Promise<DataResult<T>> {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        const appError = handleSupabaseError(error);
        logError(appError, 'BaseQuery.execute');
        
        return {
          data: null,
          error: {
            message: appError.message,
            details: appError.details,
            code: appError.code
          }
        };
      }

      return { data, error: null };
    } catch (err) {
      const appError = handleSupabaseError(err);
      logError(appError, 'BaseQuery.execute');
      
      return {
        data: null,
        error: {
          message: appError.message,
          details: appError.details,
          code: appError.code
        }
      };
    }
  }

  /**
   * Execute a paginated query with count
   */
  static async executePaginated<T>(
    queryFn: () => Promise<{ data: T[] | null; error: any; count: number | null }>,
    limit: number = 10
  ): Promise<PaginatedResult<T>> {
    try {
      const { data, error, count } = await queryFn();
      
      if (error) {
        const appError = handleSupabaseError(error);
        logError(appError, 'BaseQuery.executePaginated');
        
        return {
          data: [],
          error: {
            message: appError.message,
            details: appError.details,
            code: appError.code
          },
          count: null,
          hasMore: false
        };
      }

      const hasMore = count ? (data?.length || 0) >= limit && count > (data?.length || 0) : false;

      return { 
        data: data || [], 
        error: null, 
        count: count || 0, 
        hasMore 
      };
    } catch (err) {
      const appError = handleSupabaseError(err);
      logError(appError, 'BaseQuery.executePaginated');
      
      return {
        data: [],
        error: {
          message: appError.message,
          details: appError.details,
          code: appError.code
        },
        count: null,
        hasMore: false
      };
    }
  }

  /**
   * Build paginated query with ordering
   */
  static buildPaginatedQuery<T>(
    table: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return supabase
      .from(table)
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return {
        data: null,
        error: {
          message: 'No authenticated user found',
          details: error?.message
        }
      };
    }

    return { data: user, error: null };
  }

  /**
   * Get user profile with roles
   */
  static async getUserProfile(userId: string) {
    return this.execute(async () => {
      return await supabase
        .from('profile_users')
        .select('*, roles(name)')
        .eq('user_id', userId)
        .single();
    });
  }
}