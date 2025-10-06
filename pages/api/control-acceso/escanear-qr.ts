// pages/api/control-acceso/escanear-qr.ts
// API para escanear QR y validar datos en Control de Acceso

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { qr_code, accion } = req.body;

    if (!qr_code) {
      return res.status(400).json({ error: 'Código QR requerido' });
    }

    // 1. Buscar el viaje por QR
    const { data: viaje, error: viajeError } = await supabaseAdmin
      .from('viajes')
      .select(`
        *,
        chofer:choferes(*),
        camion:camiones(*),
        acoplado:acoplados(*),
        empresa_origen:empresas!empresa_origen_id(*),
        empresa_destino:empresas!empresa_destino_id(*)
      `)
      .eq('qr_code', qr_code)
      .single();

    if (viajeError || !viaje) {
      return res.status(404).json({ 
        error: 'Viaje no encontrado',
        details: 'El código QR no corresponde a ningún viaje válido'
      });
    }

    // 2. Validar estado actual del viaje según la acción
    if (accion === 'ingreso') {
      if (viaje.estado_viaje !== 'confirmado') {
        return res.status(400).json({
          error: 'Estado inválido para ingreso',
          details: `El viaje está en estado: ${viaje.estado_viaje}. Solo se puede ingresar viajes confirmados.`
        });
      }
    } else if (accion === 'egreso') {
      if (!['carga_finalizada', 'listo_egreso'].includes(viaje.estado_viaje)) {
        return res.status(400).json({
          error: 'Estado inválido para egreso', 
          details: `El viaje debe estar en estado 'carga_finalizada' para poder egresar.`
        });
      }
    }

    // 3. Verificar documentación vigente
    const documentacionVencida = await verificarDocumentacion(viaje);
    
    // 4. Preparar respuesta con toda la información
    const response = {
      viaje: {
        numero_viaje: viaje.numero_viaje,
        tipo_operacion: viaje.tipo_operacion,
        estado_actual: viaje.estado_viaje,
        producto: viaje.producto,
        peso_estimado: viaje.peso_estimado
      },
      chofer: {
        nombre_completo: `${viaje.chofer.nombre} ${viaje.chofer.apellido}`,
        dni: viaje.chofer.dni,
        telefono: viaje.chofer.telefono,
        email: viaje.chofer.email
      },
      vehiculo: {
        camion: {
          patente: viaje.camion.patente,
          marca: viaje.camion.marca,
          modelo: viaje.camion.modelo,
          anio: viaje.camion.anio
        },
        acoplado: viaje.acoplado ? {
          patente: viaje.acoplado.patente,
          marca: viaje.acoplado.marca,
          modelo: viaje.acoplado.modelo
        } : null
      },
      empresas: {
        origen: viaje.empresa_origen.nombre,
        destino: viaje.empresa_destino.nombre
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
    console.error('Error en escanear QR:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}

async function verificarDocumentacion(viaje: any) {
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
      puede_actualizar_documentacion: documentacionVencida.length > 0,
      mensaje: documentosCriticosVencidos.length > 0 
        ? 'No se puede ingresar por documentación vencida crítica'
        : 'Puede proceder con el ingreso'
    };
  } else if (accion === 'egreso') {
    return {
      puede_egresar: true,
      mensaje: 'Puede proceder con el egreso'
    };
  }

  return {};
}