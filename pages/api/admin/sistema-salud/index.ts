import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  generateSyncReport, 
  SyncReport 
} from '@/lib/scripts/verificar-sincronizacion';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const report = await generateSyncReport();
    return res.status(200).json(report);
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Error al generar reporte de salud',
      details: error.message,
    });
  }
}, { roles: ['admin_nodexia'] });
