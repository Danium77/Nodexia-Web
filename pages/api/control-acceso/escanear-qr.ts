// pages/api/control-acceso/escanear-qr.ts
// API para escanear QR y validar datos en Control de Acceso

import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { qr_code, accion } = req.body;

    if (!qr_code) {
      return res.status(400).json({ error: 'Código QR requerido' });
    }

    // 1. Buscar el viaje por QR en tabla viajes_despacho
    const supabase = createUserSupabaseClient(authCtx.token);
    const { data: viaje, error: viajeError } = await supabase
      .from('viajes_despacho')
      .select(`
        *,
        despacho:despachos!inner(
          id,
          pedido_id,
          origen,
          destino
        ),
        choferes(
          id,
          nombre,
          apellido,
          dni,
          telefono,
          email
        ),
        camiones(
          id,
          patente,
          marca,
          modelo,
          anio
        ),
        acoplados(
          id,
          patente,
          marca,
          modelo
        )
      `)
      .eq('qr_code', qr_code)
      .maybeSingle();

    if (viajeError || !viaje) {
      return res.status(404).json({ 
        error: 'Viaje no encontrado',
        details: 'El código QR no corresponde a ningún viaje válido'
      });
    }

    // 2. Validar estado actual del viaje según la acción
    // Prefer estado (canonical) over estado_unidad (legacy sync)
    const estadoActual = viaje.estado || viaje.estado_unidad;
    
    if (accion === 'ingreso') {
      // Puede ser ingreso a origen (desde en_transito_origen) o a destino (desde en_transito_destino)
      if (!['en_transito_origen', 'en_transito_destino'].includes(estadoActual)) {
        return res.status(400).json({
          error: 'Estado inválido para ingreso',
          details: `El viaje está en estado: ${estadoActual}. Solo se puede ingresar viajes en tránsito.`
        });
      }
    } else if (accion === 'egreso') {
      // Puede ser egreso de origen (desde cargado) o de destino (desde descargado)
      if (!['cargado', 'descargado'].includes(estadoActual)) {
        return res.status(400).json({
          error: 'Estado inválido para egreso', 
          details: `El viaje debe estar en estado 'cargado' o 'descargado' para poder egresar.`
        });
      }
    }

    // 3. Verificar documentación vigente
    const documentacionVencida = await verificarDocumentacion(viaje);
    
    // 4. Preparar respuesta con toda la información
    const response = {
      viaje: {
        id: viaje.id,
        numero_viaje: viaje.numero_viaje,
        despacho_id: viaje.despacho_id,
        estado_unidad: estadoActual,
        estado_carga: viaje.estado_carga,
        origen_id: viaje.despacho?.origen,
        destino_id: viaje.despacho?.destino
      },
      chofer: viaje.choferes ? {
        id: viaje.choferes.id,
        nombre_completo: `${viaje.choferes.nombre} ${viaje.choferes.apellido}`,
        dni: viaje.choferes.dni,
        telefono: viaje.choferes.telefono,
        email: viaje.choferes.email
      } : null,
      vehiculo: {
        camion: viaje.camiones ? {
          id: viaje.camiones.id,
          patente: viaje.camiones.patente,
          marca: viaje.camiones.marca,
          modelo: viaje.camiones.modelo,
          anio: viaje.camiones.anio
        } : null,
        acoplado: viaje.acoplados ? {
          id: viaje.acoplados.id,
          patente: viaje.acoplados.patente,
          marca: viaje.acoplados.marca,
          modelo: viaje.acoplados.modelo
        } : null
      },
      documentacion: {
        estado: documentacionVencida.length === 0 ? 'vigente' : 'con_vencimientos',
        documentos_vencidos: documentacionVencida,
        puede_ingresar: documentacionVencida.filter(d => d.critico).length === 0
      },
      acciones_disponibles: determinarAccionesDisponibles(viaje.estado_viaje, accion, documentacionVencida)
    };

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}, { roles: ['control_acceso', 'supervisor', 'coordinador', 'admin_nodexia'] });

async function verificarDocumentacion(_viaje: any) {
  // Simular verificación de documentación
  // En implementación real, consultaría tabla de documentación
  const documentosVencidos = [];
  
  // Verificar licencia de conducir (simulado)
  const fechaVencimientoLicencia = new Date('2025-12-31');
  const hoy = new Date();
  const diasParaVencer = Math.ceil((fechaVencimientoLicencia.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diasParaVencer <= 0) {
    documentosVencidos.push({
      tipo: 'licencia_conducir',
      descripcion: 'Licencia de conducir',
      fecha_vencimiento: fechaVencimientoLicencia.toISOString().split('T')[0],
      estado: 'vencida',
      critico: true
    });
  } else if (diasParaVencer <= 30) {
    documentosVencidos.push({
      tipo: 'licencia_conducir',
      descripcion: 'Licencia de conducir',
      fecha_vencimiento: fechaVencimientoLicencia.toISOString().split('T')[0],
      estado: 'por_vencer',
      dias_restantes: diasParaVencer,
      critico: false
    });
  }

  return documentosVencidos;
}

function determinarAccionesDisponibles(estadoViaje: string, accion: string, documentacionVencida: any[]) {
  const documentosCriticosVencidos = documentacionVencida.filter(d => d.critico);
  
  if (accion === 'ingreso') {
    return {
      puede_ingresar: documentosCriticosVencidos.length === 0,
      puede_rechazar: true,
      puede_crear_incidencia: documentacionVencida.length > 0,
      puede_actualizar_documentacion: documentacionVencida.length > 0,
      mensaje: documentosCriticosVencidos.length > 0 
        ? 'Documentación vencida - Crear incidencia para validación excepcional'
        : documentacionVencida.length > 0
        ? 'Puede ingresar con alerta de documentación por vencer'
        : 'Puede proceder con el ingreso',
      estado_siguiente: estadoViaje === 'en_transito_origen' ? 'ingresado_origen' : 'ingresado_destino'
    };
  } else if (accion === 'egreso') {
    return {
      puede_egresar: true,
      mensaje: 'Puede proceder con el egreso',
      estado_siguiente: estadoViaje === 'egreso_origen' ? 'en_transito_destino' : 'disponible'
    };
  }

  return {};
}