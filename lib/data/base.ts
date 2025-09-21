// lib/data/base.ts
import { supabase } from '../supabaseClient';
import type { Database } from '../database.types'; // Assuming database types exist or can be generated

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
        return {
          data: null,
          error: {
            message: error.message || 'Database operation failed',
            details: error.details,
            hint: error.hint,
            code: error.code
          }
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Unknown error occurred',
          details: 'Unexpected error during database operation'
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
        return {
          data: [],
          error: {
            message: error.message || 'Database operation failed',
            details: error.details,
            hint: error.hint,
            code: error.code
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
      return {
        data: [],
        error: {
          message: err instanceof Error ? err.message : 'Unknown error occurred',
          details: 'Unexpected error during database operation'
        },
        count: null,
        hasMore: false
      };
    }
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