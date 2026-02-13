// pages/api/control-acceso/verificar-documentacion.ts
// Verifica el estado de documentación de los recursos de un viaje
// Consulta documentos_entidad directamente (evita RPCs con bugs de FK)

import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Documentos críticos requeridos por tipo de entidad
// Para chofer: depende de si es autónomo o bajo relación de dependencia
// - Relación de dependencia (empresa tipo 'transporte'): licencia + ART cláusula no repetición
// - Autónomo (sin empresa o empresa no transporte): licencia + seguro de vida
const DOCS_CRITICOS_BASE: Record<string, string[]> = {
  camion: ['seguro', 'rto', 'cedula'],
  acoplado: ['seguro', 'rto', 'cedula'],
};

// Aliases: documentos guardados con nombres viejos que equivalen a los nuevos
// vtv → rto, tarjeta_verde/cedula_verde → cedula
const TIPO_DOC_ALIASES: Record<string, string> = {
  vtv: 'rto',
  tarjeta_verde: 'cedula',
  cedula_verde: 'cedula',
};

function normalizarTipoDoc(tipo: string): string {
  return TIPO_DOC_ALIASES[tipo] || tipo;
}

// Labels legibles para tipos de documento
const TIPO_DOC_LABELS: Record<string, string> = {
  licencia_conducir: 'Licencia de Conducir',
  art_clausula_no_repeticion: 'ART/Cláusula',
  seguro_vida_autonomo: 'Seguro de Vida',
  seguro: 'Seguro',
  rto: 'RTO',
  cedula: 'Cédula Verde',
};

function faltantesLegibles(faltantes: string[]): string {
  return faltantes.map(f => TIPO_DOC_LABELS[f] || f).join(', ');
}

// Determina los documentos críticos para un chofer según su tipo de relación laboral
async function getDocsCriticosChofer(choferId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('choferes')
    .select('empresa_id, empresas:empresa_id(tipo_empresa)')
    .eq('id', choferId)
    .single();

  if (error || !data) {
    // Si no se puede determinar, exigir ambos para ser conservador
    console.warn(`No se pudo determinar tipo de chofer ${choferId}, usando requisitos por defecto`);
    return ['licencia_conducir', 'art_clausula_no_repeticion'];
  }

  const tipoEmpresa = (data.empresas as any)?.tipo_empresa;

  if (data.empresa_id && tipoEmpresa === 'transporte') {
    // Chofer bajo relación de dependencia → ART + cláusula
    return ['licencia_conducir', 'art_clausula_no_repeticion'];
  } else {
    // Chofer autónomo → seguro de vida
    return ['licencia_conducir', 'seguro_vida_autonomo'];
  }
}

interface ProblemaDocumentacion {
  recurso: 'chofer' | 'camion' | 'acoplado';
  problema: string;
  detalle?: string;
}

interface VerificacionResult {
  estado_general: 'ok' | 'advertencia' | 'bloqueado';
  puede_operar: boolean;
  problemas: ProblemaDocumentacion[];
  detalles: {
    chofer: any;
    camion: any;
    acoplado: any;
  };
}

// Calcula el estado real de vigencia basado en fecha_vencimiento (no confía en el campo de BD que puede estar stale)
function calcularVigenciaReal(doc: { estado_vigencia: string; fecha_vencimiento: string | null }): string {
  // Si no tiene fecha de vencimiento, respetar el estado de BD (pendiente_validacion, rechazado, etc.)
  if (!doc.fecha_vencimiento) {
    return doc.estado_vigencia;
  }
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(doc.fecha_vencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  
  // Si la BD dice pendiente_validacion o rechazado, respetar eso (son estados administrativos)
  if (doc.estado_vigencia === 'pendiente_validacion' || doc.estado_vigencia === 'rechazado') {
    return doc.estado_vigencia;
  }
  
  if (vencimiento < hoy) {
    return 'vencido';
  }
  
  const diasHastaVencimiento = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diasHastaVencimiento <= 20) {
    return 'por_vencer';
  }
  
  return 'vigente';
}

async function verificarEntidad(
  entidadTipo: 'chofer' | 'camion' | 'acoplado',
  entidadId: string
): Promise<{
  tiene_documentos: boolean;
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  pendientes: number;
  faltantes: string[];
  vencidos_criticos: number; // docs REQUERIDOS que están vencidos
  por_vencer_criticos: number; // docs REQUERIDOS que están por vencer
  documentos: any[];
}> {
  // Determinar documentos críticos según tipo de entidad
  let docsCriticos: string[];
  if (entidadTipo === 'chofer') {
    docsCriticos = await getDocsCriticosChofer(entidadId);
  } else {
    docsCriticos = DOCS_CRITICOS_BASE[entidadTipo] || [];
  }

  // Consultar todos los documentos activos de esta entidad
  const { data: documentos, error } = await supabaseAdmin
    .from('documentos_entidad')
    .select('tipo_documento, estado_vigencia, fecha_vencimiento, validacion_excepcional, requiere_reconfirmacion_backoffice')
    .eq('entidad_tipo', entidadTipo)
    .eq('entidad_id', entidadId)
    .eq('activo', true);

  if (error) {
    console.error(`Error consultando docs de ${entidadTipo}:`, error);
    return {
      tiene_documentos: false,
      vigentes: 0,
      por_vencer: 0,
      vencidos: 0,
      pendientes: 0,
      faltantes: docsCriticos,
      vencidos_criticos: 0,
      por_vencer_criticos: 0,
      documentos: []
    };
  }

  const docs = documentos || [];
  
  // Recalcular vigencia en tiempo real (el trigger de BD solo corre en INSERT/UPDATE, puede estar stale)
  const docsConVigenciaReal = docs.map(d => ({
    ...d,
    vigencia_real: calcularVigenciaReal(d)
  }));

  const vigentes = docsConVigenciaReal.filter(d => d.vigencia_real === 'vigente').length;
  const por_vencer = docsConVigenciaReal.filter(d => d.vigencia_real === 'por_vencer').length;
  const vencidos = docsConVigenciaReal.filter(d => d.vigencia_real === 'vencido').length;
  const pendientes = docsConVigenciaReal.filter(d => d.vigencia_real === 'pendiente_validacion').length;

  // Para cada tipo de doc requerido, encontrar el MEJOR doc disponible
  // Prioridad: vigente > por_vencer > pendiente_validacion > vencido > rechazado
  const prioridadEstado: Record<string, number> = {
    vigente: 5,
    por_vencer: 4,
    pendiente_validacion: 3,
    vencido: 2,
    rechazado: 1,
  };

  const faltantes: string[] = [];
  let vencidos_criticos = 0;
  let por_vencer_criticos = 0;

  for (const tipoCritico of docsCriticos) {
    // Buscar docs que coincidan con este tipo (considerando aliases)
    const docsDeEsteTipo = docsConVigenciaReal.filter(
      d => normalizarTipoDoc(d.tipo_documento) === tipoCritico
    );

    if (docsDeEsteTipo.length === 0) {
      faltantes.push(tipoCritico);
      continue;
    }

    // Tomar el mejor estado entre todos los docs de este tipo
    const mejorDoc = docsDeEsteTipo.reduce((mejor, actual) => {
      const prioMejor = prioridadEstado[mejor.vigencia_real] || 0;
      const prioActual = prioridadEstado[actual.vigencia_real] || 0;
      return prioActual > prioMejor ? actual : mejor;
    });

    if (mejorDoc.vigencia_real === 'vencido') {
      vencidos_criticos++;
    } else if (mejorDoc.vigencia_real === 'por_vencer') {
      por_vencer_criticos++;
    }
  }

  return {
    tiene_documentos: docs.length > 0,
    vigentes,
    por_vencer,
    vencidos,
    pendientes,
    faltantes,
    vencidos_criticos,
    por_vencer_criticos,
    documentos: docsConVigenciaReal
  };
}

export default withAuth(async (req, res, _authCtx) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { chofer_id, camion_id, acoplado_id } = req.query;

  if (!chofer_id && !camion_id) {
    return res.status(400).json({ error: 'Se requiere al menos chofer_id o camion_id' });
  }

  try {
    const problemas: ProblemaDocumentacion[] = [];
    let estado_general: 'ok' | 'advertencia' | 'bloqueado' = 'ok';
    let puede_operar = true;

    const detalles: any = { chofer: null, camion: null, acoplado: null };

    // Verificar chofer
    if (chofer_id) {
      const resultado = await verificarEntidad('chofer', chofer_id as string);
      detalles.chofer = resultado;

      if (!resultado.tiene_documentos) {
        problemas.push({
          recurso: 'chofer',
          problema: 'documentacion_bloqueada',
          detalle: 'Sin documentación cargada'
        });
        estado_general = 'bloqueado';
        puede_operar = false;
      } else if (resultado.vencidos_criticos > 0 || resultado.faltantes.length > 0) {
        // Solo bloquear por docs REQUERIDOS vencidos o faltantes
        const partes = [];
        if (resultado.vencidos_criticos > 0) partes.push(`${resultado.vencidos_criticos} vencido(s)`);
        if (resultado.faltantes.length > 0) partes.push(`falta: ${faltantesLegibles(resultado.faltantes)}`);
        problemas.push({
          recurso: 'chofer',
          problema: 'documentacion_bloqueada',
          detalle: partes.join(' | ')
        });
        estado_general = 'bloqueado';
        puede_operar = false;
      } else if (resultado.por_vencer_criticos > 0) {
        // Por vencer = solo ADVERTENCIA, nunca bloqueo
        problemas.push({
          recurso: 'chofer',
          problema: 'documentacion_proxima_vencer',
          detalle: `${resultado.por_vencer_criticos} documento(s) requerido(s) próximo(s) a vencer`
        });
        estado_general = 'advertencia';
      }
    }

    // Verificar camión
    if (camion_id) {
      const resultado = await verificarEntidad('camion', camion_id as string);
      detalles.camion = resultado;

      if (!resultado.tiene_documentos) {
        problemas.push({
          recurso: 'camion',
          problema: 'documentacion_bloqueada',
          detalle: 'Sin documentación cargada'
        });
        estado_general = 'bloqueado';
        puede_operar = false;
      } else if (resultado.vencidos_criticos > 0 || resultado.faltantes.length > 0) {
        const partes = [];
        if (resultado.vencidos_criticos > 0) partes.push(`${resultado.vencidos_criticos} vencido(s)`);
        if (resultado.faltantes.length > 0) partes.push(`falta: ${faltantesLegibles(resultado.faltantes)}`);
        problemas.push({
          recurso: 'camion',
          problema: 'documentacion_bloqueada',
          detalle: partes.join(' | ')
        });
        estado_general = 'bloqueado';
        puede_operar = false;
      } else if (resultado.por_vencer_criticos > 0) {
        problemas.push({
          recurso: 'camion',
          problema: 'documentacion_proxima_vencer',
          detalle: `${resultado.por_vencer_criticos} documento(s) requerido(s) próximo(s) a vencer`
        });
        if (estado_general === 'ok') estado_general = 'advertencia';
      }
    }

    // Verificar acoplado (opcional)
    if (acoplado_id) {
      const resultado = await verificarEntidad('acoplado', acoplado_id as string);
      detalles.acoplado = resultado;

      if (!resultado.tiene_documentos) {
        problemas.push({
          recurso: 'acoplado',
          problema: 'documentacion_bloqueada',
          detalle: 'Sin documentación cargada'
        });
        estado_general = 'bloqueado';
        puede_operar = false;
      } else if (resultado.vencidos_criticos > 0 || resultado.faltantes.length > 0) {
        const partes = [];
        if (resultado.vencidos_criticos > 0) partes.push(`${resultado.vencidos_criticos} vencido(s)`);
        if (resultado.faltantes.length > 0) partes.push(`falta: ${faltantesLegibles(resultado.faltantes)}`);
        problemas.push({
          recurso: 'acoplado',
          problema: 'documentacion_bloqueada',
          detalle: partes.join(' | ')
        });
        estado_general = 'bloqueado';
        puede_operar = false;
      } else if (resultado.por_vencer_criticos > 0) {
        problemas.push({
          recurso: 'acoplado',
          problema: 'documentacion_proxima_vencer',
          detalle: `${resultado.por_vencer_criticos} documento(s) requerido(s) próximo(s) a vencer`
        });
        if (estado_general === 'ok') estado_general = 'advertencia';
      }
    }

    const result: VerificacionResult = {
      estado_general,
      puede_operar,
      problemas,
      detalles
    };

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error interno', details: error.message });
  }
}, { roles: ['control_acceso', 'supervisor', 'coordinador', 'admin_nodexia'] });
