// Simulate loadData using Supabase JS client against PRODUCTION
// This is exactly what the browser does
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://lkdcofsfjnltuzzzwoir.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGNvZnNmam5sdHV6enp3b2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3Mzg3NzMsImV4cCI6MjA1MTMxNDc3M30.B-0BrHlVPALaWKdRXxWiB3eqvdUMz_rsgRJHWwRkVL8';

// Service role key from .env.local (for DEV) - won't work for prod
// We need to use the anon key + sign in as Abel
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(PROD_URL, PROD_ANON_KEY);

// Abel Ramirez credentials from CREDENCIALES-DEV.md
const ABEL_EMAIL = 'abel@tecnopack.com';
const ABEL_PASS = 'tecno123';

(async () => {
  try {
    // Sign in as Abel
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: ABEL_EMAIL,
      password: ABEL_PASS,
    });
    
    if (authError) {
      console.error('Auth error:', authError.message);
      
      // Try alternative: use service role to bypass auth
      console.log('\nTrying with service role...');
      // Read CREDENCIALES-DEV.md for service key
      const fs = require('fs');
      const creds = fs.readFileSync(require('path').join(__dirname, '..', 'docs', 'CREDENCIALES-DEV.md'), 'utf8');
      const srkMatch = creds.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/);
      if (!srkMatch) {
        console.log('No service role key found for production');
        return;
      }
      const srkProd = srkMatch[1];
      const adminClient = createClient(PROD_URL, srkProd);
      
      // Phase 1
      const abelId = '1fa203c0-bbea-4eab-a1ec-b0810fbaf33c';
      const { data: ue, error: ueErr } = await adminClient
        .from('usuarios_empresa')
        .select('empresa_id, empresa:empresas!inner(id, nombre, cuit, tipo_empresa)')
        .eq('user_id', abelId)
        .eq('activo', true)
        .maybeSingle();
      
      console.log('Phase 1 result:', JSON.stringify(ue));
      console.log('Phase 1 error:', ueErr?.message);
      
      if (!ue) return;
      
      const empresaActual = ue.empresa;
      const miEmpresaId = empresaActual.id;
      const cuitEmpresa = empresaActual.cuit;
      console.log('miEmpresaId:', miEmpresaId, 'cuit:', cuitEmpresa);
      
      // Phase 2
      const ubicacionFilter = cuitEmpresa
        ? `empresa_id.eq.${miEmpresaId},cuit.eq.${cuitEmpresa}`
        : `empresa_id.eq.${miEmpresaId}`;
      
      const [companyUsersRes, ubicacionesRes] = await Promise.all([
        adminClient.from('usuarios_empresa').select('user_id').eq('empresa_id', miEmpresaId).eq('activo', true),
        adminClient.from('ubicaciones').select('id, nombre').or(ubicacionFilter),
      ]);
      
      const allCompanyUserIds = [...new Set((companyUsersRes.data || []).map(u => u.user_id).filter(Boolean))];
      if (!allCompanyUserIds.includes(abelId)) allCompanyUserIds.push(abelId);
      const ubicacionIds = (ubicacionesRes.data || []).map(u => u.id);
      
      console.log('Phase 2 companyUsers:', allCompanyUserIds.length, JSON.stringify(allCompanyUserIds));
      console.log('Phase 2 ubicaciones:', ubicacionIds.length, JSON.stringify(ubicacionesRes.data));
      console.log('Phase 2 ubicacionFilter:', ubicacionFilter);
      if (ubicacionesRes.error) console.log('Phase 2 ubicaciones error:', ubicacionesRes.error.message);
      
      // Phase 3
      if (ubicacionIds.length > 0) {
        const { data: recepciones, error: recErr } = await adminClient
          .from('despachos')
          .select('id, pedido_id, destino, destino_id, scheduled_local_date, scheduled_local_time, created_by')
          .in('destino_id', ubicacionIds)
          .not('created_by', 'in', `(${allCompanyUserIds.join(',')})`)
          .order('created_at', { ascending: true });
        
        console.log('Phase 3 recepciones:', recepciones?.length || 0);
        if (recErr) console.log('Phase 3 error:', recErr.message);
        (recepciones || []).forEach(r => console.log('  ', JSON.stringify(r)));
      } else {
        console.log('Phase 3: SKIPPED - no ubicaciones');
      }
      
      // Own despachos
      const { data: ownD, error: ownErr } = await adminClient
        .from('despachos')
        .select('id, pedido_id, scheduled_local_date')
        .in('created_by', allCompanyUserIds)
        .order('created_at', { ascending: true });
      console.log('Phase 3 own despachos:', ownD?.length || 0);
      if (ownErr) console.log('Phase 3 own error:', ownErr.message);
      
      return;
    }
    
    console.log('Signed in as:', authData.user?.email, 'id:', authData.user?.id);
    
    // Now run the exact same queries as loadData
    const userId = authData.user.id;
    
    // Phase 1
    const { data: ue, error: ueErr } = await supabase
      .from('usuarios_empresa')
      .select('empresa_id, empresa:empresas!inner(id, nombre, cuit, tipo_empresa)')
      .eq('user_id', userId)
      .eq('activo', true)
      .maybeSingle();
    
    console.log('\nPhase 1:', JSON.stringify(ue));
    if (ueErr) console.log('Phase 1 error:', ueErr.message);
    
    if (!ue) {
      console.log('FATAL: Phase 1 returned null!');
      return;
    }
    
    const empresaActual = ue.empresa;
    const miEmpresaId = empresaActual.id;
    const cuitEmpresa = empresaActual.cuit;
    console.log('miEmpresaId:', miEmpresaId, 'cuit:', cuitEmpresa);
    
    // Phase 2
    const ubicacionFilter = cuitEmpresa
      ? `empresa_id.eq.${miEmpresaId},cuit.eq.${cuitEmpresa}`
      : `empresa_id.eq.${miEmpresaId}`;
    
    const [companyUsersRes, ubicacionesRes, metricasRes] = await Promise.all([
      supabase.from('usuarios_empresa').select('user_id').eq('empresa_id', miEmpresaId).eq('activo', true),
      supabase.from('ubicaciones').select('id, nombre').or(ubicacionFilter),
      supabase.rpc('get_metricas_expiracion'),
    ]);
    
    const allCompanyUserIds = [...new Set((companyUsersRes.data || []).map(u => u.user_id).filter(Boolean))];
    if (!allCompanyUserIds.includes(userId)) allCompanyUserIds.push(userId);
    const ubicacionIds = (ubicacionesRes.data || []).map(u => u.id);
    
    console.log('\nPhase 2:');
    console.log('  companyUsers:', allCompanyUserIds.length);
    console.log('  ubicaciones:', ubicacionIds.length, JSON.stringify(ubicacionesRes.data));
    console.log('  metricas error:', metricasRes.error?.message || 'none');
    if (companyUsersRes.error) console.log('  companyUsers error:', companyUsersRes.error.message);
    if (ubicacionesRes.error) console.log('  ubicaciones error:', ubicacionesRes.error.message);
    
    // Phase 3
    if (ubicacionIds.length > 0) {
      const { data: recepciones, error: recErr } = await supabase
        .from('despachos')
        .select('id, pedido_id, destino, destino_id, scheduled_local_date, scheduled_local_time, created_by')
        .in('destino_id', ubicacionIds)
        .not('created_by', 'in', `(${allCompanyUserIds.join(',')})`)
        .order('created_at', { ascending: true });
      
      console.log('\nPhase 3 recepciones:', recepciones?.length || 0);
      if (recErr) console.log('  error:', recErr.message);
      (recepciones || []).forEach(r => console.log('  ', JSON.stringify(r)));
    } else {
      console.log('\nPhase 3: SKIPPED - no ubicaciones found!');
    }
    
  } catch (e) {
    console.error('FATAL ERROR:', e.message);
  }
})();
