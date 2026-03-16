import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { auditLog } from '@/lib/services/auditLog';

export default withAuth(async (req: NextApiRequest, res: NextApiResponse, authCtx) => {
  if (req.method === 'GET') {
    // List all features with empresa status for a given empresa_id
    const { empresa_id } = req.query;

    const { data: sistema, error: sErr } = await supabaseAdmin
      .from('funciones_sistema')
      .select('*')
      .order('modulo')
      .order('nombre');

    if (sErr) return res.status(500).json({ error: sErr.message });

    if (empresa_id && typeof empresa_id === 'string') {
      const [empresaRes, rolRes] = await Promise.all([
        supabaseAdmin.from('funciones_empresa').select('funcion_id, habilitada, config').eq('empresa_id', empresa_id),
        supabaseAdmin.from('funciones_rol').select('funcion_id, rol_interno, visible').eq('empresa_id', empresa_id),
      ]);

      const empresaMap = new Map((empresaRes.data ?? []).map(e => [e.funcion_id, e]));
      const rolMap = new Map<string, { rol_interno: string; visible: boolean }[]>();
      for (const r of rolRes.data ?? []) {
        const arr = rolMap.get(r.funcion_id) ?? [];
        arr.push({ rol_interno: r.rol_interno, visible: r.visible });
        rolMap.set(r.funcion_id, arr);
      }

      const enriched = (sistema ?? []).map(f => ({
        ...f,
        empresa_habilitada: empresaMap.get(f.id)?.habilitada ?? false,
        empresa_config: empresaMap.get(f.id)?.config ?? {},
        roles_override: rolMap.get(f.id) ?? [],
      }));

      return res.status(200).json(enriched);
    }

    return res.status(200).json(sistema);
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    // Toggle feature for empresa
    if (action === 'toggle_empresa') {
      const { empresa_id, funcion_id, habilitada } = req.body;
      if (!empresa_id || !funcion_id || typeof habilitada !== 'boolean') {
        return res.status(400).json({ error: 'empresa_id, funcion_id, habilitada required' });
      }

      const { error } = await supabaseAdmin
        .from('funciones_empresa')
        .upsert(
          { empresa_id, funcion_id, habilitada, updated_at: new Date().toISOString() },
          { onConflict: 'empresa_id,funcion_id' }
        );

      if (error) return res.status(500).json({ error: error.message });

      await auditLog(req, authCtx, {
        action: 'feature.toggle_empresa',
        targetType: 'funciones_empresa',
        targetId: funcion_id,
        metadata: { empresa_id, habilitada },
      });

      return res.status(200).json({ ok: true });
    }

    // Toggle feature visibility for a role within empresa
    if (action === 'toggle_rol') {
      const { empresa_id, funcion_id, rol_interno, visible } = req.body;
      if (!empresa_id || !funcion_id || !rol_interno || typeof visible !== 'boolean') {
        return res.status(400).json({ error: 'empresa_id, funcion_id, rol_interno, visible required' });
      }

      const { error } = await supabaseAdmin
        .from('funciones_rol')
        .upsert(
          { empresa_id, funcion_id, rol_interno, visible, updated_at: new Date().toISOString() },
          { onConflict: 'empresa_id,funcion_id,rol_interno' }
        );

      if (error) return res.status(500).json({ error: error.message });

      await auditLog(req, authCtx, {
        action: 'feature.toggle_rol',
        targetType: 'funciones_rol',
        targetId: funcion_id,
        metadata: { empresa_id, rol_interno, visible },
      });

      return res.status(200).json({ ok: true });
    }

    // Toggle global kill switch
    if (action === 'toggle_global') {
      const { funcion_id, activo } = req.body;
      if (!funcion_id || typeof activo !== 'boolean') {
        return res.status(400).json({ error: 'funcion_id, activo required' });
      }

      const { error } = await supabaseAdmin
        .from('funciones_sistema')
        .update({ activo })
        .eq('id', funcion_id);

      if (error) return res.status(500).json({ error: error.message });

      await auditLog(req, authCtx, {
        action: 'feature.toggle_global',
        targetType: 'funciones_sistema',
        targetId: funcion_id,
        metadata: { activo },
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}, { roles: ['admin_nodexia'] });
