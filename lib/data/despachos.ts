// lib/data/despachos.ts
import { supabase } from '../supabaseClient';
import { BaseQuery, DataResult, PaginatedResult } from './base';
import type { Despacho, DespachoCreateInput, DespachoUpdateInput } from '../types';

export class DespachosData {
  /**
   * Get all dispatches with optional filtering
   */
  static async getAll(
    filters?: {
      estado?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      chofer_id?: string;
      camion_id?: string;
      cliente_id?: string;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<Despacho>> {
    return BaseQuery.executePaginated(async () => {
      let query = supabase
        .from('despachos')
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `, { count: 'exact' })
        .order('fecha_creacion', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters) {
        if (filters.estado) {
          query = query.eq('estado', filters.estado);
        }
        if (filters.fechaDesde) {
          query = query.gte('fecha_despacho', filters.fechaDesde);
        }
        if (filters.fechaHasta) {
          query = query.lte('fecha_despacho', filters.fechaHasta);
        }
        if (filters.chofer_id) {
          query = query.eq('chofer_id', filters.chofer_id);
        }
        if (filters.camion_id) {
          query = query.eq('camion_id', filters.camion_id);
        }
        if (filters.cliente_id) {
          query = query.eq('cliente_id', filters.cliente_id);
        }
      }

      return await query;
    }, limit);
  }

  /**
   * Get dispatch by ID with full details
   */
  static async getById(id: string): Promise<DataResult<Despacho>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .select(`
          *,
          chofer:choferes(*),
          camion:camiones(*),
          acoplado:acoplados(*),
          cliente:clientes(*)
        `)
        .eq('id', id)
        .single();
    });
  }

  /**
   * Create new dispatch
   */
  static async create(despachoData: DespachoCreateInput): Promise<DataResult<Despacho>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .insert([despachoData])
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .single();
    });
  }

  /**
   * Update dispatch
   */
  static async update(id: string, updates: DespachoUpdateInput): Promise<DataResult<Despacho>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .single();
    });
  }

  /**
   * Delete dispatch
   */
  static async delete(id: string): Promise<DataResult<null>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .delete()
        .eq('id', id);
    });
  }

  /**
   * Get active dispatches (en ruta, asignado)
   */
  static async getActive(): Promise<DataResult<Despacho[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .in('estado', ['asignado', 'en_ruta'])
        .order('fecha_despacho', { ascending: true });
    });
  }

  /**
   * Get dispatches by driver
   */
  static async getByChofer(choferId: string): Promise<DataResult<Despacho[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .eq('chofer_id', choferId)
        .order('fecha_despacho', { ascending: false });
    });
  }

  /**
   * Get dispatches by truck
   */
  static async getByCamion(camionId: string): Promise<DataResult<Despacho[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .eq('camion_id', camionId)
        .order('fecha_despacho', { ascending: false });
    });
  }

  /**
   * Get dispatches by client
   */
  static async getByCliente(clienteId: string): Promise<DataResult<Despacho[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .eq('cliente_id', clienteId)
        .order('fecha_despacho', { ascending: false });
    });
  }

  /**
   * Update dispatch status
   */
  static async updateStatus(id: string, estado: string): Promise<DataResult<Despacho>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .update({ estado })
        .eq('id', id)
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          acoplado:acoplados(id, numero_acoplado, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .single();
    });
  }

  /**
   * Get dispatches for dashboard (recent activity)
   */
  static async getForDashboard(limit: number = 10): Promise<DataResult<Despacho[]>> {
    return BaseQuery.execute(async () => {
      return await supabase
        .from('despachos')
        .select(`
          *,
          chofer:choferes(id, nombre, apellido, dni),
          camion:camiones(id, numero_movil, patente, marca, modelo),
          cliente:clientes(id, razon_social, cuit)
        `)
        .order('fecha_creacion', { ascending: false })
        .limit(limit);
    });
  }

  /**
   * Get statistics for date range
   */
  static async getStatistics(fechaDesde: string, fechaHasta: string) {
    return BaseQuery.execute(async () => {
      const { data, error } = await supabase
        .from('despachos')
        .select('estado, count(*)')
        .gte('fecha_despacho', fechaDesde)
        .lte('fecha_despacho', fechaHasta);

      if (error) throw error;

      // Transform data into statistics object
      const stats = {
        total: 0,
        completados: 0,
        en_ruta: 0,
        asignados: 0,
        cancelados: 0
      };

      data?.forEach((row: any) => {
        stats.total += row.count;
        stats[row.estado as keyof typeof stats] = row.count;
      });

      return { data: stats, error: null };
    });
  }
}