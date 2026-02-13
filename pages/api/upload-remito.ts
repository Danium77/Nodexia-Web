// pages/api/upload-remito.ts
// API route to upload remito photos using service_role (bypasses RLS)
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

export default withAuth(async (req, res, { userId }) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB max
    const [fields, files] = await form.parse(req);

    const viajeId = fields.viaje_id?.[0];
    const file = files.file?.[0];

    if (!viajeId || !file) {
      return res.status(400).json({ error: 'Missing viaje_id or file' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.filepath);
    const timestamp = Date.now();
    const ext = file.originalFilename?.split('.').pop() || 'jpg';
    const fileName = `${viajeId}/${timestamp}_remito.${ext}`;

    // Upload to storage using admin client (bypasses RLS)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('remitos')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('remitos')
      .getPublicUrl(fileName);

    // Save record in documentos_viaje_seguro using admin client
    await supabaseAdmin
      .from('documentos_viaje_seguro')
      .insert({
        viaje_id: viajeId,
        tipo: 'remito',
        nombre_archivo: file.originalFilename || 'remito.jpg',
        file_url: urlData.publicUrl,
        storage_path: fileName,
        fecha_emision: new Date().toISOString(),
        subido_por: userId,
      });

    // Cleanup temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
