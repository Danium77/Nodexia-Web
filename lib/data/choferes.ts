// lib/data/choferes.ts
import { supabase } from '../supabaseClient';
import { BaseQuery, DataResult, PaginatedResult } from './base';
import type { Chofer } from '../types';

export class ChoferesData {
  /**
   * Get all drivers with optional search
   */
  static async getAll(
    searchTerm?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<Chofer>> {
    return BaseQuery.executePaginated(async () => {
      let query = supabase
        .from('choferes')
        .select('*', { count: 'exact' })
        .order('apellido', { ascending: true })
        .range(offset, offset + limit - 1);

      if (searchTerm) {
        query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,dni.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`);
      }

      return await query;
    }, limit);
  }

  /**
   * Get driver by ID
   */
  static async getById(id: string): Promise<DataResult<Chofer>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .select('*')
        .eq('id', id)
        .single();
    });
  }

  /**
   * Get driver by DNI
   */
  static async getByDni(dni: string): Promise<DataResult<Chofer>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .select('*')
        .eq('dni', dni)
        .single();
    });
  }

  /**
   * Create new driver
   */
  static async create(choferData: Partial<Chofer>): Promise<DataResult<Chofer>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .insert([choferData])
        .select()
        .single();
    });
  }

  /**
   * Update driver
   */
  static async update(id: string, updates: Partial<Chofer>): Promise<DataResult<Chofer>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    });
  }

  /**
   * Delete driver
   */
  static async delete(id: string): Promise<DataResult<null>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .delete()
        .eq('id', id);
    });
  }

  /**
   * Check if DNI already exists (for validation)
   */
  static async dniExists(dni: string, excludeId?: string): Promise<DataResult<boolean>> {
    const result = await BaseQuery.execute(async () => {
      let query = supabase
        .from('choferes')
        .select('id')
        .eq('dni', dni);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      return await query.maybeSingle();
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    return { data: !!result.data, error: null };
  }

  /**
   * Get available drivers (not assigned to active dispatches)
   */
  static async getAvailable(): Promise<DataResult<Chofer[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .select('*')
        .eq('estado', 'disponible')
        .order('apellido', { ascending: true });
    });
  }

  /**
   * Get drivers by status
   */
  static async getByStatus(estado: string): Promise<DataResult<Chofer[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .select('*')
        .eq('estado', estado)
        .order('apellido', { ascending: true });
    });
  }

  /**
   * Search drivers by multiple criteria
   */
  static async search(criteria: {
    nombre?: string;
    apellido?: string;
    dni?: string;
    telefono?: string;
    email?: string;
    estado?: string;
    licencia_tipo?: string;
  }): Promise<PaginatedResult<Chofer>> {
    return BaseQuery.executePaginated(async () => {
      let query = supabase
        .from('choferes')
        .select('*', { count: 'exact' })
        .order('apellido', { ascending: true });

      // Build dynamic filters
      const filters: string[] = [];
      
      if (criteria.nombre) {
        filters.push(`nombre.ilike.%${criteria.nombre}%`);
      }
      if (criteria.apellido) {
        filters.push(`apellido.ilike.%${criteria.apellido}%`);
      }
      if (criteria.dni) {
        filters.push(`dni.ilike.%${criteria.dni}%`);
      }
      if (criteria.telefono) {
        filters.push(`telefono.ilike.%${criteria.telefono}%`);
      }
      if (criteria.email) {
        filters.push(`email.ilike.%${criteria.email}%`);
      }

      if (filters.length > 0) {
        query = query.or(filters.join(','));
      }

      // Add exact match filters
      if (criteria.estado) {
        query = query.eq('estado', criteria.estado);
      }
      if (criteria.licencia_tipo) {
        query = query.eq('licencia_tipo', criteria.licencia_tipo);
      }

      return await query;
    });
  }

  /**
   * Update driver status
   */
  static async updateStatus(id: string, estado: string): Promise<DataResult<Chofer>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('choferes')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();
    });
  }

  /**
   * Get drivers with expiring licenses (within next 30 days)
   */
  static async getExpiringLicenses(days: number = 30): Promise<DataResult<Chofer[]>> {
    return BaseQuery.execute(async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      
      return await supabase
        .from('choferes')
        .select('*')
        .lte('licencia_vencimiento', futureDate.toISOString().split('T')[0])
        .order('licencia_vencimiento', { ascending: true });
    });
  }
}