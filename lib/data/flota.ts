// lib/data/flota.ts
import { supabase } from '../supabaseClient';
import { BaseQuery, DataResult, PaginatedResult } from './base';
import type { Camion, Acoplado, CamionCreateInput, CamionUpdateInput, AcopladoCreateInput, AcopladoUpdateInput } from '../types';

export class FlotaData {
  // === CAMIONES ===
  
  /**
   * Get all trucks with optional search
   */
  static async getAllCamiones(
    searchTerm?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<Camion>> {
    return BaseQuery.executePaginated(async () => {
      let query = supabase
        .from('camiones')
        .select('*', { count: 'exact' })
        .order('numero_movil', { ascending: true })
        .range(offset, offset + limit - 1);

      if (searchTerm) {
        query = query.or(`numero_movil.ilike.%${searchTerm}%,patente.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%`);
      }

      return await query;
    }, limit);
  }

  /**
   * Get truck by ID
   */
  static async getCamionById(id: string): Promise<DataResult<Camion>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('camiones')
        .select('*')
        .eq('id', id)
        .single();
    });
  }

  /**
   * Get truck by patent number
   */
  static async getCamionByPatente(patente: string): Promise<DataResult<Camion>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('camiones')
        .select('*')
        .eq('patente', patente)
        .single();
    });
  }

  /**
   * Create new truck
   */
  static async createCamion(camionData: CamionCreateInput): Promise<DataResult<Camion>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('camiones')
        .insert([camionData])
        .select()
        .single();
    });
  }

  /**
   * Update truck
   */
  static async updateCamion(id: string, updates: CamionUpdateInput): Promise<DataResult<Camion>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('camiones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    });
  }

  /**
   * Delete truck
   */
  static async deleteCamion(id: string): Promise<DataResult<null>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('camiones')
        .delete()
        .eq('id', id);
    });
  }

  // === ACOPLADOS ===

  /**
   * Get all trailers with optional search
   */
  static async getAllAcoplados(
    searchTerm?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<Acoplado>> {
    return BaseQuery.executePaginated(async () => {
      let query = supabase
        .from('acoplados')
        .select('*', { count: 'exact' })
        .order('numero_acoplado', { ascending: true })
        .range(offset, offset + limit - 1);

      if (searchTerm) {
        query = query.or(`numero_acoplado.ilike.%${searchTerm}%,patente.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%`);
      }

      return await query;
    }, limit);
  }

  /**
   * Get trailer by ID
   */
  static async getAcopladoById(id: string): Promise<DataResult<Acoplado>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('acoplados')
        .select('*')
        .eq('id', id)
        .single();
    });
  }

  /**
   * Create new trailer
   */
  static async createAcoplado(acopladoData: AcopladoCreateInput): Promise<DataResult<Acoplado>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('acoplados')
        .insert([acopladoData])
        .select()
        .single();
    });
  }

  /**
   * Update trailer
   */
  static async updateAcoplado(id: string, updates: AcopladoUpdateInput): Promise<DataResult<Acoplado>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('acoplados')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    });
  }

  /**
   * Delete trailer
   */
  static async deleteAcoplado(id: string): Promise<DataResult<null>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('acoplados')
        .delete()
        .eq('id', id);
    });
  }

  // === VALIDATION HELPERS ===

  /**
   * Check if truck patent already exists
   */
  static async camionPatenteExists(patente: string, excludeId?: string): Promise<DataResult<boolean>> {
    const result = await BaseQuery.execute(async () => {
      let query = supabase
        .from('camiones')
        .select('id')
        .eq('patente', patente);

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
   * Check if trailer patent already exists
   */
  static async acopladoPatenteExists(patente: string, excludeId?: string): Promise<DataResult<boolean>> {
    const result = await BaseQuery.execute(async () => {
      let query = supabase
        .from('acoplados')
        .select('id')
        .eq('patente', patente);

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
   * Get available trucks (not assigned to active dispatches)
   */
  static async getAvailableCamiones(): Promise<DataResult<Camion[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('camiones')
        .select('*')
        .eq('estado', 'disponible')
        .order('numero_movil', { ascending: true });
    });
  }

  /**
   * Get available trailers (not assigned to active dispatches)
   */
  static async getAvailableAcoplados(): Promise<DataResult<Acoplado[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('acoplados')
        .select('*')
        .eq('estado', 'disponible')
        .order('numero_acoplado', { ascending: true });
    });
  }
}