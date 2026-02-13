// pages/api/documentacion/estado-batch.ts
// API para consultar estado de documentación de múltiples entidades en una sola llamada
// Usado por: Unidades Operativas, Dashboard, Control de Acceso

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

interface EntidadQuery {
  tipo: 'chofer' | 'camion' | 'acoplado' | 'transporte';
  id: string;
}

interface DocStatus {
  total_requeridos: number;
  total_subidos: number;
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  faltantes: string[];
  estado: 'ok' | 'warning' | 'danger' | 'missing';
}

// Documentos requeridos por tipo de entidad
// Para chofer: depende del tipo de empresa (dependencia vs autónomo)
const DOCS_REQUERIDOS_BASE: Record<string, string[]> = {
  camion: ['seguro', 'rto', 'cedula'],
  acoplado: ['seguro', 'rto', 'cedula'],
  transporte: ['seguro_carga_global'],
};

// Aliases: tipos de documento viejos → nuevos
const TIPO_DOC_ALIASES: Record<string, string> = {
  vtv: 'rto',
  tarjeta_verde: 'cedula',
  cedula_verde: 'cedula',
};

function normalizarTipoDoc(tipo: string): string {
  return TIPO_DOC_ALIASES[tipo] || tipo;
}

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { entidades } = req.body as { entidades: EntidadQuery[] };

    if (!entidades || !Array.isArray(entidades) || entidades.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de entidades' });
    }

    // Limitar a 100 entidades por request
    if (entidades.length > 100) {
      return res.status(400).json({ error: 'Máximo 100 entidades por consulta' });
    }

    // Obtener todos los IDs de entidades
    const allIds = entidades.map(e => e.id);

    // Para choferes: determinar tipo de empresa para saber qué docs requieren
    const choferIds = entidades.filter(e => e.tipo === 'chofer').map(e => e.id);
    const choferEmpresaMap = new Map<string, string | null>();
    
    if (choferIds.length > 0) {
      const { data: choferes } = await supabaseAdmin
        .from('choferes')
        .select('id, empresa_id, empresas:empresa_id(tipo_empresa)')
        .in('id', choferIds);
      
      for (const c of (choferes || [])) {
        const tipoEmpresa = (c.empresas as any)?.tipo_empresa || null;
        choferEmpresaMap.set(c.id, tipoEmpresa);
      }
    }

    // Una sola query para todos los documentos de todas las entidades
    let docsQuery = supabaseAdmin
      .from('documentos_entidad')
      .select('entidad_tipo, entidad_id, tipo_documento, estado_vigencia, fecha_vencimiento, activo')
      .in('entidad_id', allIds)
      .eq('activo', true);

    // Empresa scoping
    if (authCtx.empresaId) {
      docsQuery = docsQuery.eq('empresa_id', authCtx.empresaId);
    }

    const { data: docs, error: queryError } = await docsQuery;

    if (queryError) throw queryError;

    // Procesar resultados por entidad
    const resultado: Record<string, DocStatus> = {};

    for (const entidad of entidades) {
      const key = `${entidad.tipo}:${entidad.id}`;
      let requeridos: string[];
      
      if (entidad.tipo === 'chofer') {
        const tipoEmpresa = choferEmpresaMap.get(entidad.id) || null;
        if (tipoEmpresa === 'transporte') {
          requeridos = ['licencia_conducir', 'art_clausula_no_repeticion'];
        } else {
          requeridos = ['licencia_conducir', 'seguro_vida_autonomo'];
        }
      } else {
        requeridos = DOCS_REQUERIDOS_BASE[entidad.tipo] || [];
      }
      
      const docsEntidad = (docs || []).filter(
        d => d.entidad_id === entidad.id && d.entidad_tipo === entidad.tipo
      );

      // Contar por estado
      let vigentes = 0;
      let porVencer = 0;
      let vencidos = 0;
      const tiposSubidos = new Set<string>();

      for (const doc of docsEntidad) {
        tiposSubidos.add(normalizarTipoDoc(doc.tipo_documento));

        // Calcular vigencia real basada en fecha_vencimiento
        const hoy = new Date();
        const vencimiento = doc.fecha_vencimiento ? new Date(doc.fecha_vencimiento) : null;

        if (!vencimiento) {
          // Sin fecha de vencimiento = vigente (algunos docs no vencen)
          vigentes++;
        } else if (vencimiento < hoy) {
          vencidos++;
        } else {
          // Verificar si vence en los próximos 30 días
          const en30Dias = new Date();
          en30Dias.setDate(en30Dias.getDate() + 30);
          if (vencimiento <= en30Dias) {
            porVencer++;
          } else {
            vigentes++;
          }
        }
      }

      const faltantes = requeridos.filter(r => !tiposSubidos.has(r));

      // Determinar estado general
      let estado: DocStatus['estado'] = 'ok';
      if (faltantes.length > 0 && tiposSubidos.size === 0) {
        estado = 'missing'; // No tiene ningún documento
      } else if (vencidos > 0 || faltantes.length > 0) {
        estado = 'danger'; // Tiene docs vencidos o faltantes
      } else if (porVencer > 0) {
        estado = 'warning'; // Todo OK pero algunos por vencer
      }

      resultado[key] = {
        total_requeridos: requeridos.length,
        total_subidos: tiposSubidos.size,
        vigentes,
        por_vencer: porVencer,
        vencidos,
        faltantes,
        estado,
      };
    }

    return res.status(200).json({ data: resultado });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});
