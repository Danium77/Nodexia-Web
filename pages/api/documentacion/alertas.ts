// pages/api/documentacion/alertas.ts
// API para obtener alertas de documentación de una empresa
// Retorna: docs vencidos, por vencer, entidades sin docs completos

import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Documentos requeridos por tipo de entidad
// Para chofer: depende del tipo de empresa (dependencia vs autónomo)
const DOCS_REQUERIDOS_BASE: Record<string, string[]> = {
  camion: ['seguro', 'rto', 'cedula'],
  acoplado: ['seguro', 'rto', 'cedula'],
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

function getDocsRequeridosChofer(tipoEmpresa: string | null): string[] {
  if (tipoEmpresa === 'transporte') {
    // Chofer bajo relación de dependencia → ART + cláusula
    return ['licencia_conducir', 'art_clausula_no_repeticion'];
  } else {
    // Chofer autónomo → seguro de vida
    return ['licencia_conducir', 'seguro_vida_autonomo'];
  }
}

interface Alerta {
  tipo: 'vencido' | 'por_vencer' | 'faltante';
  entidad_tipo: string;
  entidad_nombre: string;
  documento: string;
  fecha_vencimiento?: string;
  dias_restantes?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'No autorizado' });

    // Obtener empresa_id del usuario
    const { data: relacion } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('empresa_id, empresas:empresa_id(tipo_empresa)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!relacion?.empresa_id) {
      return res.status(200).json({ data: { alertas: [], resumen: { vencidos: 0, por_vencer: 0, faltantes: 0, total: 0 } } });
    }

    const empresaId = relacion.empresa_id;
    const tipoEmpresa = (relacion.empresas as any)?.tipo_empresa as string | null;
    const hoy = new Date();
    const en30Dias = new Date();
    en30Dias.setDate(en30Dias.getDate() + 30);

    // Cargar entidades de la empresa
    const [choferes, camiones, acoplados] = await Promise.all([
      supabaseAdmin.from('choferes').select('id, nombre, apellido').eq('empresa_id', empresaId).eq('activo', true),
      supabaseAdmin.from('camiones').select('id, patente, marca, modelo').eq('empresa_id', empresaId).eq('activo', true),
      supabaseAdmin.from('acoplados').select('id, patente').eq('empresa_id', empresaId).eq('activo', true),
    ]);

    // Cargar todos los documentos activos de la empresa
    const allEntityIds = [
      ...(choferes.data || []).map(c => c.id),
      ...(camiones.data || []).map(c => c.id),
      ...(acoplados.data || []).map(c => c.id),
    ];

    if (allEntityIds.length === 0) {
      return res.status(200).json({ data: { alertas: [], resumen: { vencidos: 0, por_vencer: 0, faltantes: 0, total: 0 } } });
    }

    const { data: docs } = await supabaseAdmin
      .from('documentos_entidad')
      .select('entidad_tipo, entidad_id, tipo_documento, fecha_vencimiento, estado_vigencia')
      .in('entidad_id', allEntityIds)
      .eq('activo', true);

    const docsByEntity = new Map<string, Set<string>>();
    const alertas: Alerta[] = [];

    // Normalizar tipos de documento (alias vtv→rto, tarjeta_verde→cedula)

    // Procesar docs existentes
    for (const doc of (docs || [])) {
      const key = `${doc.entidad_tipo}:${doc.entidad_id}`;
      if (!docsByEntity.has(key)) docsByEntity.set(key, new Set());
      docsByEntity.get(key)!.add(normalizarTipoDoc(doc.tipo_documento));

      if (doc.fecha_vencimiento) {
        const venc = new Date(doc.fecha_vencimiento);
        if (venc < hoy) {
          const entidadNombre = getEntidadNombre(doc.entidad_tipo, doc.entidad_id, choferes.data, camiones.data, acoplados.data);
          alertas.push({
            tipo: 'vencido',
            entidad_tipo: doc.entidad_tipo,
            entidad_nombre: entidadNombre,
            documento: doc.tipo_documento,
            fecha_vencimiento: doc.fecha_vencimiento,
            dias_restantes: Math.floor((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
          });
        } else if (venc <= en30Dias) {
          const dias = Math.floor((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          const entidadNombre = getEntidadNombre(doc.entidad_tipo, doc.entidad_id, choferes.data, camiones.data, acoplados.data);
          alertas.push({
            tipo: 'por_vencer',
            entidad_tipo: doc.entidad_tipo,
            entidad_nombre: entidadNombre,
            documento: doc.tipo_documento,
            fecha_vencimiento: doc.fecha_vencimiento,
            dias_restantes: dias,
          });
        }
      }
    }

    // Detectar faltantes
    const checkEntities = [
      ...(choferes.data || []).map(c => ({ tipo: 'chofer', id: c.id, nombre: `${c.nombre} ${c.apellido}` })),
      ...(camiones.data || []).map(c => ({ tipo: 'camion', id: c.id, nombre: `${c.patente} ${c.marca || ''} ${c.modelo || ''}`.trim() })),
      ...(acoplados.data || []).map(c => ({ tipo: 'acoplado', id: c.id, nombre: c.patente })),
    ];

    for (const ent of checkEntities) {
      const key = `${ent.tipo}:${ent.id}`;
      const tiposSubidos = docsByEntity.get(key) || new Set();
      const requeridos = ent.tipo === 'chofer'
        ? getDocsRequeridosChofer(tipoEmpresa)
        : (DOCS_REQUERIDOS_BASE[ent.tipo] || []);

      for (const req of requeridos) {
        if (!tiposSubidos.has(req)) {
          alertas.push({
            tipo: 'faltante',
            entidad_tipo: ent.tipo,
            entidad_nombre: ent.nombre,
            documento: req,
          });
        }
      }
    }

    // Ordenar: vencidos primero, luego por_vencer, luego faltantes
    alertas.sort((a, b) => {
      const orden = { vencido: 0, por_vencer: 1, faltante: 2 };
      return orden[a.tipo] - orden[b.tipo];
    });

    const resumen = {
      vencidos: alertas.filter(a => a.tipo === 'vencido').length,
      por_vencer: alertas.filter(a => a.tipo === 'por_vencer').length,
      faltantes: alertas.filter(a => a.tipo === 'faltante').length,
      total: alertas.length,
    };

    return res.status(200).json({ data: { alertas, resumen } });
  } catch (err: any) {
    console.error('Error alertas docs:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}

function getEntidadNombre(tipo: string, id: string, choferes: any[], camiones: any[], acoplados: any[]): string {
  if (tipo === 'chofer') {
    const c = (choferes || []).find((x: any) => x.id === id);
    return c ? `${c.nombre} ${c.apellido}` : id;
  }
  if (tipo === 'camion') {
    const c = (camiones || []).find((x: any) => x.id === id);
    return c ? `${c.patente}` : id;
  }
  if (tipo === 'acoplado') {
    const c = (acoplados || []).find((x: any) => x.id === id);
    return c ? c.patente : id;
  }
  return id;
}
