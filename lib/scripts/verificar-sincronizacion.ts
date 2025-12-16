/**
 * Script de Verificación y Sincronización de Usuarios
 * Detecta y corrige inconsistencias entre auth.users y usuarios_empresa
 */

import { createClient } from '@supabase/supabase-js';

// Tipos
interface UserHealthCheck {
  categoria: string;
  cantidad: number;
  detalles: any;
}

interface RepairResult {
  usuario_id: string;
  email: string;
  accion_realizada: string;
}

export interface SyncReport {
  timestamp: string;
  health: UserHealthCheck[];
  repairs: RepairResult[];
  warnings: string[];
  errors: string[];
  summary: {
    total_users: number;
    healthy_users: number;
    orphaned_users: number;
    repaired_users: number;
    health_percentage: number;
  };
}

/**
 * Verifica la salud del sistema de usuarios
 */
export async function checkUsersHealth(): Promise<UserHealthCheck[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan variables de entorno: SUPABASE_URL o SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.rpc('check_users_health');

  if (error) {
    console.error('Error al verificar salud:', error);
    throw error;
  }

  return data || [];
}

/**
 * Repara usuarios huérfanos automáticamente
 */
export async function repairOrphanUsers(): Promise<RepairResult[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan variables de entorno: SUPABASE_URL o SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.rpc('repair_orphan_users');

  if (error) {
    console.error('Error al reparar usuarios:', error);
    throw error;
  }

  return data || [];
}

/**
 * Genera un reporte completo de sincronización
 */
export async function generateSyncReport(): Promise<SyncReport> {
  const timestamp = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Verificar salud
    console.log('🔍 Verificando salud del sistema...');
    const health = await checkUsersHealth();

    // 2. Analizar métricas
    const totalUsers = health.find(h => h.categoria === 'total_auth_users')?.cantidad || 0;
    const sinProfile = health.find(h => h.categoria === 'sin_profile')?.cantidad || 0;
    const sinUsuarios = health.find(h => h.categoria === 'sin_usuarios')?.cantidad || 0;
    const sinEmpresa = health.find(h => h.categoria === 'sin_empresa')?.cantidad || 0;
    const activosConEmpresa = health.find(h => h.categoria === 'activos_con_empresa')?.cantidad || 0;

    const orphanedUsers = sinProfile + sinUsuarios + sinEmpresa;

    // 3. Generar warnings
    if (sinProfile > 0) {
      warnings.push(`⚠️  ${sinProfile} usuario(s) sin entrada en profiles`);
    }
    if (sinUsuarios > 0) {
      warnings.push(`⚠️  ${sinUsuarios} usuario(s) sin entrada en tabla usuarios`);
    }
    if (sinEmpresa > 0) {
      warnings.push(`⚠️  ${sinEmpresa} usuario(s) sin empresa asignada`);
    }

    // 4. Reparar si hay problemas
    let repairs: RepairResult[] = [];
    if (orphanedUsers > 0) {
      console.log('🔧 Reparando usuarios huérfanos...');
      repairs = await repairOrphanUsers();
    }

    // 5. Calcular salud
    const healthyUsers = activosConEmpresa;
    const healthPercentage = totalUsers > 0 
      ? Math.round((healthyUsers / totalUsers) * 100) 
      : 0;

    const summary = {
      total_users: totalUsers,
      healthy_users: healthyUsers,
      orphaned_users: orphanedUsers,
      repaired_users: repairs.length,
      health_percentage: healthPercentage
    };

    return {
      timestamp,
      health,
      repairs,
      warnings,
      errors,
      summary
    };

  } catch (error) {
    errors.push(`❌ Error al generar reporte: ${error}`);
    throw error;
  }
}

/**
 * Imprime un reporte formateado en consola
 */
export function printSyncReport(report: SyncReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE DE SINCRONIZACIÓN DE USUARIOS');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('');

  console.log('📈 RESUMEN:');
  console.log(`  Total de usuarios: ${report.summary.total_users}`);
  console.log(`  Usuarios saludables: ${report.summary.healthy_users}`);
  console.log(`  Usuarios huérfanos: ${report.summary.orphaned_users}`);
  console.log(`  Usuarios reparados: ${report.summary.repaired_users}`);
  console.log(`  Salud del sistema: ${report.summary.health_percentage}%`);
  console.log('');

  if (report.warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS:');
    report.warnings.forEach(w => console.log(`  ${w}`));
    console.log('');
  }

  if (report.repairs.length > 0) {
    console.log('🔧 REPARACIONES REALIZADAS:');
    report.repairs.forEach(r => {
      console.log(`  ✓ ${r.email} (${r.accion_realizada})`);
    });
    console.log('');
  }

  if (report.errors.length > 0) {
    console.log('❌ ERRORES:');
    report.errors.forEach(e => console.log(`  ${e}`));
    console.log('');
  }

  console.log('='.repeat(60));

  // Indicador de salud
  if (report.summary.health_percentage >= 90) {
    console.log('✅ Sistema saludable');
  } else if (report.summary.health_percentage >= 70) {
    console.log('⚠️  Sistema requiere atención');
  } else {
    console.log('❌ Sistema crítico - revisar inmediatamente');
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * Ejecuta verificación y reparación automática
 */
export async function autoVerifyAndRepair(): Promise<SyncReport> {
  console.log('🚀 Iniciando verificación y reparación automática...\n');
  
  const report = await generateSyncReport();
  printSyncReport(report);
  
  return report;
}

// Si se ejecuta directamente desde línea de comandos
if (require.main === module) {
  autoVerifyAndRepair()
    .then(() => {
      console.log('✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en verificación:', error);
      process.exit(1);
    });
}
