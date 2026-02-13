import type { NextApiRequest, NextApiResponse } from 'next';
import { repairOrphanUsers } from '@/lib/scripts/verificar-sincronizacion';
import { withAuth } from '@/lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const repairs = await repairOrphanUsers();

    return res.status(200).json({
      success: true,
      repairs,
      count: repairs.length,
      message: `Se repararon ${repairs.length} usuario(s)`,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error al reparar usuarios',
      details: error.message,
    });
  }
}, { roles: ['admin_nodexia'] });
