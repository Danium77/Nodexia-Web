// lib/data/clientes.ts
import { supabase } from '../supabaseClient';
import { BaseQuery, DataResult, PaginatedResult } from './base';
import type { Cliente } from '../types';

export class ClientesData {
  /**
   * Get all clients with optional search
   */
  static async getAll(
    searchTerm?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<Cliente>> {
    return BaseQuery.executePaginated(async () => {
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('razon_social', { ascending: true })
        .range(offset, offset + limit - 1);

      if (searchTerm) {
        query = query.or(`razon_social.ilike.%${searchTerm}%,cuit.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      return await query;
    }, limit);
  }

  /**
   * Get client by ID
   */
  static async getById(id: string): Promise<DataResult<Cliente>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
    });
  }

  /**
   * Get client by CUIT
   */
  static async getByCuit(cuit: string): Promise<DataResult<Cliente>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('cuit', cuit)
        .single();
    });
  }

  /**
   * Create new client
   */
  static async create(clientData: Partial<Cliente>): Promise<DataResult<Cliente>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('clientes')
        .insert([clientData])
        .select()
        .single();
    });
  }

  /**
   * Update client
   */
  static async update(id: string, updates: Partial<Cliente>): Promise<DataResult<Cliente>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    });
  }

  /**
   * Delete client
   */
  static async delete(id: string): Promise<DataResult<null>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
    });
  }

  /**
   * Check if CUIT already exists (for validation)
   */
  static async cuitExists(cuit: string, excludeId?: string): Promise<DataResult<boolean>> {
    const result = await BaseQuery.execute(async () => {
      let query = supabase
        .from('clientes')
        .select('id')
        .eq('cuit', cuit);

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
   * Search clients by multiple criteria
   */
  static async search(criteria: {
    razonSocial?: string;
    cuit?: string;
    email?: string;
    telefono?: string;
    localidad?: string;
    provincia?: string;
  }): Promise<PaginatedResult<Cliente>> {
    return BaseQuery.executePaginated(async () => {
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('razon_social', { ascending: true });

      // Build dynamic filters
      const filters: string[] = [];
      
      if (criteria.razonSocial) {
        filters.push(`razon_social.ilike.%${criteria.razonSocial}%`);
      }
      if (criteria.cuit) {
        filters.push(`cuit.ilike.%${criteria.cuit}%`);
      }
      if (criteria.email) {
        filters.push(`email.ilike.%${criteria.email}%`);
      }
      if (criteria.telefono) {
        filters.push(`telefono.ilike.%${criteria.telefono}%`);
      }
      if (criteria.localidad) {
        filters.push(`localidad.ilike.%${criteria.localidad}%`);
      }
      if (criteria.provincia) {
        filters.push(`provincia.ilike.%${criteria.provincia}%`);
      }

      if (filters.length > 0) {
        query = query.or(filters.join(','));
      }

      return await query;
    });
  }
}