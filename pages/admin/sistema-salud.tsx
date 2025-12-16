import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn-compat';
import { Badge } from '@/components/ui/shadcn-compat';
import { Button } from '@/components/ui/Button';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Users,
  Activity,
  Wrench,
  Shield
} from 'lucide-react';

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

interface SyncReport {
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

export default function SistemaSaludPage() {
  const [report, setReport] = useState<SyncReport | null>(null);
  const [loading, setLoading] = useState(false);

  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sistema-salud');
      if (!response.ok) throw new Error('Error al cargar reporte');
      const data: SyncReport = await response.json();
      setReport(data);
      setLastCheck(new Date().toLocaleString('es-AR'));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runRepair = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sistema-salud/repair', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Error al reparar');
      await loadReport();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle2 className="w-8 h-8 text-green-600" />;
    if (percentage >= 70) return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
    return <XCircle className="w-8 h-8 text-red-600" />;
  };

  const getHealthStatus = (percentage: number) => {
    if (percentage >= 90) return 'Saludable';
    if (percentage >= 70) return 'Requiere atención';
    return 'Crítico';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Salud del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoreo y sincronización de usuarios
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadReport} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            onClick={runRepair} 
            disabled={loading || !report || report.summary.orphaned_users === 0}
            variant="primary"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Reparar Ahora
          </Button>
        </div>
      </div>

      {lastCheck && (
        <p className="text-sm text-muted-foreground mb-4">
          Última verificación: {lastCheck}
        </p>
      )}

      {/* Resumen Principal */}
      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
            {/* Estado General */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Estado General
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-4xl font-bold ${getHealthColor(report.summary.health_percentage)}`}>
                      {report.summary.health_percentage}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getHealthStatus(report.summary.health_percentage)}
                    </p>
                  </div>
                  {getHealthIcon(report.summary.health_percentage)}
                </div>
              </CardContent>
            </Card>

            {/* Total Usuarios */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.summary.total_users}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  En auth.users
                </p>
              </CardContent>
            </Card>

            {/* Usuarios Saludables */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Saludables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {report.summary.healthy_users}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Con empresa activa
                </p>
              </CardContent>
            </Card>

            {/* Usuarios Huérfanos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Huérfanos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {report.summary.orphaned_users}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren atención
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Advertencias */}
          {report.warnings.length > 0 && (
            <Alert className="mb-6 border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {report.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Errores */}
          {report.errors.length > 0 && (
            <Alert className="mb-6 border-red-500 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {report.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Reparaciones Recientes */}
          {report.repairs.length > 0 && (
            <Alert className="mb-6 border-blue-500 bg-blue-50">
              <Wrench className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold mb-2">
                  Se repararon {report.repairs.length} usuario(s):
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {report.repairs.map((repair, idx) => (
                    <li key={idx}>
                      {repair.email} - {repair.accion_realizada}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Detalles por Categoría */}
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Vista General</TabsTrigger>
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="audit">Auditoría</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.health.map((item, idx) => {
                  const isIssue = ['sin_profile', 'sin_usuarios', 'sin_empresa'].includes(item.categoria);
                  return (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          {isIssue && item.cantidad > 0 ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          {item.categoria.replace(/_/g, ' ').toUpperCase()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">
                          {item.cantidad}
                        </div>
                        {item.detalles && typeof item.detalles === 'object' && (
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(item.detalles, null, 2)}
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Detalles Técnicos</CardTitle>
                  <CardDescription>
                    Información detallada de la verificación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(report, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Registro de Auditoría
                  </CardTitle>
                  <CardDescription>
                    Próximamente: historial de cambios y reparaciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Esta funcionalidad estará disponible en la próxima versión
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Haz clic en "Actualizar" para verificar la salud del sistema
            </p>
          </CardContent>
        </Card>
      )}

      {loading && !report && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <p>Verificando sistema...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
