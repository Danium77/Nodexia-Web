import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import AdminLayout from '../../components/layout/AdminLayout';
import WizardUsuario from '../../components/Admin/WizardUsuario';
import { supabase } from '../../lib/supabaseClient';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

interface Usuario {
  id: string;
  user_id?: string;
  empresa_id: string;
  rol_interno: string;
  nombre_completo?: string;
  email_interno?: string;
  telefono_interno?: string;
  departamento?: string;
  fecha_ingreso?: string;
  activo: boolean;
  fecha_vinculacion: string;
  // Campos calculados/mapeados
  full_name?: string;
  email?: string;
  telefono?: string;
  dni?: string;
  created_at?: string;
  status: 'active' | 'invited' | 'inactive';
  empresa: {
    id: string;
    nombre: string;
    cuit: string;
  };
  rol: {
    id: string;
    nombre: string;
    tipo: string;
  };
  last_sign_in_at?: string;
}

interface FilterState {
  empresa: string;
  rol: string;
  status: string;
  busqueda: string;
}

const UsuariosPage = () => {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [filters, setFilters] = useState<FilterState>({
    empresa: '',
    rol: '',
    status: '',
    busqueda: ''
  });
  
  // Estados para estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    coordinadores: 0,
    transportes: 0
  });

  // Estados para modales
  const [showWizard, setShowWizard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Opciones para filtros (se cargarán dinámicamente)
  const [empresasOptions, setEmpresasOptions] = useState<Array<{id: string, nombre: string}>>([]);
  const [rolesOptions, setRolesOptions] = useState<Array<{id: number, nombre: string}>>([]);

  // Cargar usuarios y opciones
  useEffect(() => {
    loadUsuarios();
    loadFilterOptions();
  }, []);

  // Recalcular estadísticas cuando cambian los usuarios
  useEffect(() => {
    calculateStats();
  }, [usuarios]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('usuarios_empresa')
        .select(`
          *,
          empresas (
            id,
            nombre,
            cuit
          )
        `)
        .order('fecha_vinculacion', { ascending: false });

      if (error) throw error;

      // Obtener lista de usuarios válidos en auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      const validUserIds = new Set(authUsers?.users?.map(u => u.id) || []);
      
      console.log('👥 Usuarios válidos en auth:', validUserIds.size);
      console.log('📋 Registros en usuarios_empresa:', data?.length || 0);

      // Filtrar solo usuarios que existen en auth.users
      const usuariosValidos = data?.filter(usuario => {
        const isValid = validUserIds.has(usuario.user_id);
        if (!isValid) {
          console.log('⚠️ Usuario inválido encontrado en usuarios_empresa:', usuario.email_interno || usuario.user_id);
        }
        return isValid;
      }) || [];

      console.log('✅ Usuarios válidos después del filtro:', usuariosValidos.length);

      // Enriquecer los datos con información de roles desde roles_empresa
      const usuariosEnriquecidos = [];
      
      for (const usuario of usuariosValidos) {
        try {
          // Buscar información del rol en roles_empresa
          const { data: rolData } = await supabase
            .from('roles_empresa')
            .select('nombre_rol, tipo_empresa, descripcion')
            .eq('nombre_rol', usuario.rol_interno)
            .single();

          usuariosEnriquecidos.push({
            ...usuario,
            rol: {
              id: usuario.rol_interno,
              nombre: rolData?.nombre_rol || usuario.rol_interno,
              tipo: rolData?.tipo_empresa || 'desconocido'
            },
            // Mapear campos para compatibilidad
            full_name: usuario.nombre_completo,
            created_at: usuario.fecha_vinculacion,
            status: usuario.activo ? 'active' : 'inactive'
          });
        } catch (rolError) {
          // Si no encuentra el rol, usar datos básicos
          usuariosEnriquecidos.push({
            ...usuario,
            rol: {
              id: usuario.rol_interno,
              nombre: usuario.rol_interno,
              tipo: 'desconocido'
            },
            // Mapear campos para compatibilidad
            full_name: usuario.nombre_completo,
            created_at: usuario.fecha_vinculacion,
            status: usuario.activo ? 'active' : 'inactive'
          });
        }
      }

      setUsuarios(usuariosEnriquecidos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [empresasResult, rolesResult] = await Promise.all([
        supabase.from('empresas').select('id, nombre').order('nombre'),
        supabase.from('roles_empresa').select('nombre_rol, tipo_empresa').order('nombre_rol')
      ]);

      if (empresasResult.data) {
        setEmpresasOptions(empresasResult.data);
      }
      
      if (rolesResult.data && Array.isArray(rolesResult.data)) {
        // Crear opciones únicas de roles
        const rolesUnicos: Array<{id: number, nombre: string}> = [];
        rolesResult.data.forEach((rol, index) => {
          if (rol.nombre_rol && !rolesUnicos.find(r => r.nombre === rol.nombre_rol)) {
            rolesUnicos.push({
              id: index + 1,
              nombre: rol.nombre_rol
            });
          }
        });
        setRolesOptions(rolesUnicos);
      } else {
        setRolesOptions([]);
      }
    } catch (err) {
      console.error('Error cargando opciones de filtro:', err);
      setEmpresasOptions([]);
      setRolesOptions([]);
    }
  };

  const calculateStats = () => {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.status === 'active').length;
    const inactivos = usuarios.filter(u => u.status === 'inactive').length;
    const coordinadores = usuarios.filter(u => u.rol?.tipo === 'coordinador' || u.rol_interno === 'coordinador').length;
    const transportes = usuarios.filter(u => u.rol?.tipo === 'transporte' || u.rol_interno === 'chofer' || u.rol_interno === 'admin').length;

    setStats({
      total,
      activos,
      inactivos,
      coordinadores,
      transportes
    });
  };

  // Función para probar el envío de emails
  const testEmail = async () => {
    const emailPrueba = prompt('Ingresa un email para probar el envío de invitaciones:');
    
    if (!emailPrueba || !emailPrueba.includes('@')) {
      alert('Por favor ingresa un email válido.');
      return;
    }

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailPrueba }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Email enviado exitosamente!\n\n${result.message}\n\n💡 ${result.details}`);
      } else {
        console.error('Error de diagnóstico:', result);
        
        if (result.error === 'Configuración SMTP faltante en Supabase') {
          alert(`❌ Problema encontrado: ${result.error}\n\n📧 Solución:\n${result.details}\n\n🔧 ${result.solution}`);
        } else {
          alert(`❌ Error: ${result.error}\n\n📋 Detalles: ${result.details || 'Ver consola para más información'}`);
        }
      }
    } catch (error: any) {
      console.error('Error en test de email:', error);
      alert(`💥 Error de conexión: ${error.message}\n\nVerifica que el servidor esté ejecutándose.`);
    }
  };

  // Función para crear enlace manual
  const crearEnlaceManual = async () => {
    const email = prompt('Ingresa el email del usuario a invitar:');
    if (!email || !email.includes('@')) {
      alert('Por favor ingresa un email válido.');
      return;
    }

    const profileId = prompt('Ingresa el ID del perfil (empresa):');
    if (!profileId) {
      alert('Profile ID es requerido.');
      return;
    }

    const roleId = prompt('Ingresa el ID del rol:');
    if (!roleId) {
      alert('Role ID es requerido.');
      return;
    }

    try {
      const response = await fetch('/api/admin/crear-enlace-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          profileId, 
          roleId 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Mostrar mensajes para copiar
        const mensaje = `✅ Usuario creado exitosamente!\n\n` +
                       `📧 Email: ${email}\n` +
                       `🔑 Contraseña temporal: ${result.tempPassword}\n` +
                       `🔗 Enlace: ${result.enlaceInvitacion}\n\n` +
                       `📋 MENSAJE PARA WHATSAPP:\n${result.mensajeWhatsApp}\n\n` +
                       `📧 MENSAJE PARA EMAIL:\n${result.mensajeEmail}`;
        
        // Crear un textarea para facilitar la copia
        const textarea = document.createElement('textarea');
        textarea.value = result.mensajeWhatsApp;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        alert(`${mensaje}\n\n📋 El mensaje de WhatsApp ya se copió al portapapeles!`);
        
        // Recargar usuarios
        loadUsuarios();
      } else {
        console.error('Error:', result);
        alert(`❌ Error: ${result.error}\n\n${result.details || 'Ver consola para más información'}`);
      }
    } catch (error: any) {
      console.error('Error creando enlace manual:', error);
      alert(`💥 Error: ${error.message}`);
    }
  };

  // Función para verificar estado de invitaciones
  const verificarInvitaciones = async () => {
    try {
      const response = await fetch('/api/admin/verificar-invitaciones');
      const result = await response.json();

      if (response.ok) {
        const { estadisticas, invitaciones_pendientes, recomendaciones } = result;
        
        let mensaje = `📊 ESTADO DE INVITACIONES\n\n` +
                     `👥 Total usuarios: ${estadisticas.total_usuarios}\n` +
                     `✅ Confirmados: ${estadisticas.usuarios_confirmados}\n` +
                     `⏳ Pendientes: ${estadisticas.invitaciones_pendientes}\n` +
                     `🟢 Activos: ${estadisticas.usuarios_activos}\n\n`;

        if (invitaciones_pendientes.length > 0) {
          mensaje += `📋 INVITACIONES PENDIENTES:\n`;
          invitaciones_pendientes.forEach(inv => {
            mensaje += `• ${inv.email} (${inv.dias_desde_invitacion} días)\n`;
          });
          mensaje += `\n💡 RECOMENDACIONES:\n`;
          recomendaciones.forEach(rec => {
            mensaje += `• ${rec}\n`;
          });
        } else {
          mensaje += `🎉 ¡No hay invitaciones pendientes!`;
        }

        alert(mensaje);
      } else {
        alert(`❌ Error: ${result.error}\n${result.details || ''}`);
      }
    } catch (error: any) {
      console.error('Error verificando invitaciones:', error);
      alert(`💥 Error: ${error.message}`);
    }
  };

  // Función para reenviar invitación
  const reenviarInvitacion = async () => {
    const email = prompt('Ingresa el email del usuario para reenviar la invitación:');
    
    if (!email || !email.includes('@')) {
      alert('Por favor ingresa un email válido.');
      return;
    }

    try {
      const response = await fetch('/api/admin/reenviar-invitacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}\n\n📧 Email: ${result.email}\n⏰ Enviado: ${new Date(result.timestamp).toLocaleString('es-ES')}\n\n💡 ${result.recomendacion}`);
        
        // Recargar usuarios para actualizar el estado
        loadUsuarios();
      } else {
        if (result.error === 'Usuario ya registrado') {
          alert(`ℹ️ ${result.error}\n\n${result.details}\n\nEste usuario ya puede iniciar sesión normalmente.`);
        } else if (result.error === 'Error de SMTP') {
          alert(`❌ ${result.error}\n\n${result.details}\n\nRevisa la configuración en el dashboard de Supabase.`);
        } else {
          alert(`❌ Error: ${result.error}\n\n${result.details || 'Ver consola para más información'}`);
        }
      }
    } catch (error: any) {
      console.error('Error reenviando invitación:', error);
      alert(`💥 Error: ${error.message}`);
    }
  };

  // Función para eliminar usuario completo de Supabase
  const eliminarUsuario = async () => {
    const email = prompt(
      '⚠️ ELIMINAR USUARIO COMPLETO DE SUPABASE\n\n' +
      'Esta acción eliminará PERMANENTEMENTE:\n' +
      '• Usuario de auth.users\n' +
      '• Todas las referencias en profile_users\n' +
      '• Todas las referencias en usuarios\n' +
      '• Todas las referencias en usuarios_empresa\n' +
      '• Opcionalmente referencias en documentos, despachos, etc.\n\n' +
      'Ingresa el EMAIL del usuario a eliminar:'
    );
    
    if (!email || !email.includes('@')) {
      if (email !== null) { // Si no canceló
        alert('❌ Por favor ingresa un email válido.');
      }
      return;
    }

    const confirmar = confirm(
      `🚨 CONFIRMACIÓN FINAL\n\n` +
      `¿Estás SEGURO de que quieres eliminar COMPLETAMENTE al usuario:\n` +
      `${email}\n\n` +
      `⚠️ ESTA ACCIÓN ES IRREVERSIBLE\n\n` +
      `El usuario podrá registrarse nuevamente con el mismo email después de la eliminación.`
    );

    if (!confirmar) {
      return;
    }

    const eliminarTodo = confirm(
      '🔧 NIVEL DE ELIMINACIÓN\n\n' +
      'Haz clic en "Aceptar" para eliminar TODAS las referencias del usuario en TODAS las tablas\n' +
      'Haz clic en "Cancelar" para eliminación básica (solo auth, profile_users, usuarios)'
    );

    try {
      const response = await fetch('/api/admin/eliminar-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          deleteAll: eliminarTodo 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        let mensaje = `✅ ${result.message}\n\n`;
        mensaje += `📊 RESUMEN DE ELIMINACIÓN:\n`;
        mensaje += `• Auth User: ${result.details.authUserDeleted ? '✅' : '❌'}\n`;
        mensaje += `• Profile Users: ${result.details.profileUserDeleted ? '✅' : '❌'}\n`;
        mensaje += `• Tabla Usuarios: ${result.details.usuariosDeleted ? '✅' : '❌'}\n`;
        mensaje += `• Usuarios Empresa: ${result.details.usuariosEmpresaDeleted ? '✅' : '❌'}\n`;
        
        if (result.details.otherReferencesDeleted.length > 0) {
          mensaje += `• Otras Referencias: ${result.details.otherReferencesDeleted.join(', ')}\n`;
        }
        
        mensaje += `\n💡 El email ${email} está ahora disponible para nuevo registro.`;

        alert(mensaje + '\n\n🔄 Actualizando lista de usuarios...');
        
        // Recargar usuarios para actualizar la lista
        console.log('🔄 Recargando lista de usuarios...');
        setLoading(true);
        
        // Pequeño delay para asegurar que la eliminación se propagó
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await loadUsuarios();
        console.log('✅ Lista de usuarios actualizada');
        
        setLoading(false);
      } else {
        alert(`❌ Error: ${result.message}\n\n${result.error || 'Ver consola para más información'}`);
      }
    } catch (error: any) {
      console.error('Error eliminando usuario:', error);
      alert(`💥 Error: ${error.message}`);
    }
  };

  // Función para verificar conexión SMTP sin envío
  const verificarConexionSMTP = async () => {
    try {
      const response = await fetch('/api/admin/verificar-smtp-conexion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      let mensaje = `🔧 VERIFICACIÓN DE CONEXIÓN SMTP\n\n`;
      
      if (result.success) {
        mensaje += `✅ ${result.mensaje}\n\n`;
        mensaje += `⚙️ ESTADO:\n`;
        mensaje += `• Supabase: ${result.configuracion_detectada.supabase_conectado ? '✅ Conectado' : '❌ Desconectado'}\n`;
        mensaje += `• Auth disponible: ${result.configuracion_detectada.auth_disponible ? '✅ SÍ' : '❌ NO'}\n`;
        mensaje += `• Estado SMTP: ${result.configuracion_detectada.smtp_status}\n\n`;
        mensaje += `💡 ${result.recomendacion}`;
      } else {
        mensaje += `❌ ${result.problema}\n`;
        mensaje += `📋 ${result.detalles}\n\n`;
        mensaje += `🔧 Tipo de Error: ${result.configuracion_detectada.error_tipo}`;
      }

      alert(mensaje);
    } catch (error: any) {
      console.error('Error verificando conexión SMTP:', error);
      alert(`💥 Error verificando conexión: ${error.message}`);
    }
  };

  // Función para test específico de Gmail
  const testGmailSMTP = async () => {
    const email = prompt('Email para probar envío (opcional, se usará waltedanielzaas@gmail.com por defecto):') || 'waltedanielzaas@gmail.com';
    
    try {
      const response = await fetch('/api/admin/test-gmail-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      let mensaje = `📧 TEST ESPECÍFICO GMAIL SMTP\n\n`;
      
      if (result.success) {
        mensaje += `✅ ${result.mensaje}\n`;
        mensaje += `📧 Email enviado a: ${result.email_enviado_a}\n\n`;
        mensaje += `🎉 ¡Gmail SMTP funciona correctamente!`;
      } else if (result.test_completed) {
        mensaje += `❌ ${result.problema}\n\n`;
        mensaje += `🔧 SOLUCIÓN: ${result.solucion}\n\n`;
        
        if (result.error_details) {
          mensaje += `📋 ERROR TÉCNICO:\n`;
          mensaje += `• Código: ${result.error_details.code}\n`;
          mensaje += `• Estado: ${result.error_details.status}\n`;
          mensaje += `• Mensaje: ${result.error_details.message}\n\n`;
        }
        
        if (result.configuracion_recomendada) {
          mensaje += `⚙️ CONFIGURACIÓN RECOMENDADA:\n`;
          mensaje += `• Host: ${result.configuracion_recomendada.host}\n`;
          mensaje += `• Puerto: ${result.configuracion_recomendada.port}\n`;
          mensaje += `• Usuario: ${result.configuracion_recomendada.username}\n`;
          mensaje += `• Contraseña: ${result.configuracion_recomendada.password}\n\n`;
        }
        
        if (result.pasos_verificacion) {
          mensaje += `✔️ PASOS A VERIFICAR:\n`;
          result.pasos_verificacion.forEach((paso: string) => {
            mensaje += `${paso}\n`;
          });
        }
      } else {
        mensaje += `❌ ${result.problema}\n`;
        mensaje += `📋 ${result.detalles}`;
      }

      alert(mensaje);
    } catch (error: any) {
      console.error('Error en test Gmail:', error);
      alert(`💥 Error ejecutando test Gmail: ${error.message}`);
    }
  };



  // Función para reenviar invitación a usuario existente
  const reenviarInvitacionUsuario = async (email: string) => {
    if (!email) {
      alert('⚠️ Se requiere un email para reenviar la invitación');
      return;
    }

    try {
      const response = await fetch('/api/admin/reenviar-invitacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}\n\n📧 Nueva invitación enviada a: ${email}\n\n${result.instrucciones?.join('\n') || ''}`);
      } else {
        alert(`❌ Error: ${result.error}\n\n${result.details || ''}`);
      }
    } catch (error: any) {
      console.error('Error reenviando invitación:', error);
      alert(`💥 Error: ${error.message}`);
    }
  };

  // Función para diagnóstico completo de SMTP
  const diagnosticarConfiguracionEmail = async () => {
    const email = prompt('Ingresa un email para diagnóstico (opcional, se usará test@example.com por defecto):') || 'test@example.com';
    
    try {
      const response = await fetch('/api/admin/diagnosticar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      let mensaje = `🔬 DIAGNÓSTICO COMPLETO DE EMAIL\n\n`;
      mensaje += `📧 Email probado: ${email}\n`;
      mensaje += `🎯 Problema: ${result.problema}\n`;
      mensaje += `📋 Detalles: ${result.detalles}\n\n`;
      mensaje += `🔧 Solución: ${result.solucion}\n\n`;
      mensaje += `⚙️ CONFIGURACIÓN DETECTADA:\n`;
      mensaje += `• SMTP Configurado: ${result.configuracion_detectada.smtp_configurado ? '✅ SÍ' : '❌ NO'}\n`;
      mensaje += `• Tipo de Error: ${result.configuracion_detectada.error_tipo}\n`;
      mensaje += `• Recomendación: ${result.configuracion_detectada.recomendacion}\n\n`;
      
      if (!result.success) {
        mensaje += `💡 ACCIONES DISPONIBLES:\n`;
        mensaje += `• Usar el botón "🔗 Enlace Manual" para crear usuarios sin SMTP\n`;
        mensaje += `• Configurar SMTP en Supabase Dashboard → Settings → Auth\n`;
        mensaje += `• Contactar administrador del sistema`;
      } else {
        mensaje += `🎉 ¡Todo funciona correctamente!`;
      }

      alert(mensaje);
    } catch (error: any) {
      console.error('Error en diagnóstico:', error);
      alert(`💥 Error ejecutando diagnóstico: ${error.message}`);
    }
  };

  // Filtrar usuarios según los filtros aplicados
  const usuariosFiltrados = usuarios.filter(usuario => {
    if (filters.empresa && usuario.empresa?.id !== filters.empresa) return false;
    if (filters.rol && !rolesOptions.find(r => r.id === parseInt(filters.rol) && r.nombre === usuario.rol_interno)) return false;
    if (filters.status && usuario.status !== filters.status) return false;
    
    if (filters.busqueda) {
      const busqueda = filters.busqueda.toLowerCase();
      const coincidencia = 
        usuario.full_name?.toLowerCase().includes(busqueda) ||
        usuario.nombre_completo?.toLowerCase().includes(busqueda) ||
        usuario.email_interno?.toLowerCase().includes(busqueda) ||
        usuario.empresa?.nombre?.toLowerCase().includes(busqueda) ||
        usuario.rol_interno?.toLowerCase().includes(busqueda);
      
      if (!coincidencia) return false;
    }
    
    return true;
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      empresa: '',
      rol: '',
      status: '',
      busqueda: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon, label: 'Activo' },
      invited: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: UserIcon, label: 'Invitado' },
      inactive: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon, label: 'Inactivo' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="Usuarios">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Gestión de Usuarios">
      <div className="space-y-6">
        {/* Header con estadísticas */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
              <p className="text-gray-400 mt-1">
                Administra los usuarios del sistema y sus permisos
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={verificarInvitaciones}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Ver estado de invitaciones pendientes"
              >
                📊 Estado Invitaciones
              </button>
              <button
                onClick={testEmail}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Diagnosticar problemas de email"
              >
                📧 Probar Email
              </button>
              <button
                onClick={verificarConexionSMTP}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Verificar conexión SMTP sin envío (evita rate limits)"
              >
                🔧 Conexión SMTP
              </button>
              <button
                onClick={testGmailSMTP}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Prueba específica de configuración Gmail SMTP"
              >
                📧 Test Gmail
              </button>
              <button
                onClick={diagnosticarConfiguracionEmail}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Diagnóstico completo de configuración SMTP"
              >
                🔬 Diagnóstico SMTP
              </button>
              <button
                onClick={reenviarInvitacion}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Reenviar invitación a un usuario"
              >
                🔄 Reenviar
              </button>
              <button
                onClick={crearEnlaceManual}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Crear usuario con enlace manual (alternativa sin email)"
              >
                🔗 Enlace Manual
              </button>

              <button
                onClick={eliminarUsuario}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Eliminar usuario completo de Supabase (libera el email para reutilizar)"
              >
                🗑️ Eliminar Usuario
              </button>
              <button
                onClick={() => {
                  console.log('🔄 Forzando recarga manual...');
                  loadUsuarios();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                title="Forzar actualización de la lista de usuarios"
              >
                🔄 Actualizar Lista
              </button>
              <button
                onClick={() => setShowWizard(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Invitar Usuario
              </button>
              <button
                onClick={() => {
                  const email = prompt('Ingresa el email del usuario para reenviar la invitación:');
                  if (email) reenviarInvitacionUsuario(email);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                🔄 Reenviar Invitación
              </button>
            </div>
          </div>

          {/* Cards de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-cyan-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Total Usuarios</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Activos</p>
                  <p className="text-2xl font-bold text-white">{stats.activos}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <XCircleIcon className="h-8 w-8 text-red-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Inactivos</p>
                  <p className="text-2xl font-bold text-white">{stats.inactivos}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Coordinadores</p>
                  <p className="text-2xl font-bold text-white">{stats.coordinadores}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-purple-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Transportes</p>
                  <p className="text-2xl font-bold text-white">{stats.transportes}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, DNI o empresa..."
                value={filters.busqueda}
                onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Botón de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              Filtros
            </button>

            {/* Limpiar filtros */}
            {(filters.empresa || filters.rol || filters.status) && (
              <button
                onClick={clearFilters}
                className="text-cyan-400 hover:text-cyan-300 px-4 py-2 rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Panel de filtros expandible */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Empresa</label>
                <select
                  value={filters.empresa}
                  onChange={(e) => handleFilterChange('empresa', e.target.value)}
                  className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Todas las empresas</option>
                  {empresasOptions.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rol</label>
                <select
                  value={filters.rol}
                  onChange={(e) => handleFilterChange('rol', e.target.value)}
                  className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Todos los roles</option>
                  {rolesOptions.map(rol => (
                    <option key={rol.id} value={rol.id.toString()}>{rol.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="invited">Invitado</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de usuarios */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">
              Lista de Usuarios ({usuariosFiltrados.length})
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-red-900 border-b border-red-700">
              <p className="text-red-300">Error: {error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-cyan-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {usuario.nombre_completo?.charAt(0).toUpperCase() || usuario.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {usuario.nombre_completo || usuario.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-400">{usuario.email_interno || usuario.email || 'Sin email'}</div>
                          {usuario.departamento && (
                            <div className="text-xs text-gray-500">Depto: {usuario.departamento}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{usuario.empresa?.nombre}</div>
                      <div className="text-xs text-gray-400">CUIT: {usuario.empresa?.cuit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{usuario.rol?.nombre || usuario.rol_interno}</div>
                      <div className="text-xs text-gray-400 capitalize">{usuario.rol?.tipo || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(usuario.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(usuario.fecha_vinculacion || usuario.created_at)}
                      {usuario.fecha_ingreso && (
                        <div className="text-xs text-gray-500">
                          Ingreso: {formatDate(usuario.fecha_ingreso)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/usuarios/${usuario.id}`)}
                          className="text-cyan-400 hover:text-cyan-300 p-1"
                          title="Ver detalles"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* TODO: Abrir modal de edición */}}
                          className="text-yellow-400 hover:text-yellow-300 p-1"
                          title="Editar usuario"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* TODO: Confirmar eliminación */}}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Eliminar usuario"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usuariosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-300">No hay usuarios</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {usuarios.length === 0 
                    ? 'Comienza creando tu primer usuario.' 
                    : 'No se encontraron usuarios con los filtros aplicados.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Wizard para crear usuario */}
        <WizardUsuario
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            loadUsuarios(); // Recargar la lista de usuarios
            setShowWizard(false);
          }}
        />


      </div>
    </AdminLayout>
  );
};

export default UsuariosPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};
