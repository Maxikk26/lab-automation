import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requirePermission } from '../auth.js';

const router = Router();

// Catálogo de todos los exámenes en DB con flag excluido
router.get('/examenes/catalogo', authenticate, async (req, res) => {
  try {
    const seccion = req.query.seccion as string | undefined;

    let query = `
      SELECT DISTINCT
        s.nombre                                                      AS seccion,
        TRIM(SPLIT_PART(te.examen, '-', 1))                          AS codigo_examen,
        TRIM(SUBSTR(te.examen, STRPOS(te.examen, '-') + 1))         AS nombre_examen,
        CASE WHEN ee.id IS NOT NULL THEN true ELSE false END         AS excluido,
        ee.motivo
      FROM tiempos_entrega.tiempos_examen te
      LEFT JOIN tiempos_entrega.secciones s
          ON s.id = te.seccion_id
          OR (te.seccion_id IS NULL AND s.nombre_norm = UPPER(TRIM(te.seccion_padre)))
      LEFT JOIN tiempos_entrega.examenes_excluidos ee
          ON ee.seccion_id = s.id
          AND TRIM(SPLIT_PART(te.examen, '-', 1)) = ee.codigo_examen
      WHERE s.id IS NOT NULL
        AND STRPOS(te.examen, '-') > 0
    `;

    const params: any[] = [];
    if (seccion) {
      params.push(seccion);
      query += ` AND s.nombre_norm = UPPER(TRIM($1))`;
    }

    query += ` ORDER BY s.nombre, codigo_examen`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch catalogo error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Lista exámenes excluidos, opcionalmente filtrados por sección
router.get('/exclusiones', authenticate, async (req, res) => {
  try {
    const seccion = req.query.seccion as string | undefined;

    let query = `SELECT ee.id, s.nombre AS seccion, ee.codigo_examen, ee.nombre_examen, ee.motivo
                 FROM tiempos_entrega.examenes_excluidos ee
                 JOIN tiempos_entrega.secciones s ON s.id = ee.seccion_id`;
    const params: any[] = [];

    if (seccion) {
      query += ` WHERE s.nombre_norm = UPPER(TRIM($1))`;
      params.push(seccion);
    }

    query += ` ORDER BY s.nombre, ee.codigo_examen`;
    const { rows } = await pool.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch exclusiones error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Agregar exclusiones (uno o varios — chunks de 100, sin transaccion, idempotente)
router.post('/admin/exclusiones/save', authenticate, requirePermission('puede_editar_examenes'), async (req, res) => {
  try {
    const items: Array<{ seccion: string; codigo_examen: string; nombre_examen?: string; motivo?: string }> =
      Array.isArray(req.body) ? req.body : [req.body];

    if (items.length === 0 || !items[0].seccion || !items[0].codigo_examen) {
      res.status(400).json({ success: false, message: 'Seccion y codigo_examen son requeridos' });
      return;
    }

    // Trim + deduplicar por (seccion, codigo_examen)
    const deduped = [...new Map(
      items.map((x) => [
        `${x.seccion.trim()}|${x.codigo_examen.trim()}`,
        { ...x, seccion: x.seccion.trim(), codigo_examen: x.codigo_examen.trim() },
      ])
    ).values()];

    const CHUNK = 100;
    for (let i = 0; i < deduped.length; i += CHUNK) {
      const chunk = deduped.slice(i, i + CHUNK);
      const valPlaceholders = chunk.map((_, j) =>
        `($${j * 4 + 1}, (SELECT id FROM tiempos_entrega.secciones WHERE nombre_norm = UPPER(TRIM(unaccent($${j * 4 + 1})))), $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`
      ).join(', ');
      const valParams = chunk.flatMap((x) => [
        x.seccion, x.codigo_examen, x.nombre_examen || null, x.motivo || null,
      ]);
      await pool.query(
        `INSERT INTO tiempos_entrega.examenes_excluidos (seccion, seccion_id, codigo_examen, nombre_examen, motivo)
         VALUES ${valPlaceholders}
         ON CONFLICT (seccion, codigo_examen)
         DO UPDATE SET nombre_examen = EXCLUDED.nombre_examen,
                       motivo = EXCLUDED.motivo,
                       seccion_id = EXCLUDED.seccion_id`,
        valParams
      );
    }

    res.json({ success: true, count: deduped.length });
  } catch (err) {
    console.error('Save exclusion error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Eliminar exclusiones (uno o varios — chunks de 200, sin transaccion, idempotente)
router.post('/admin/exclusiones/delete', authenticate, requirePermission('puede_editar_examenes'), async (req, res) => {
  try {
    const items: Array<{ seccion: string; codigo_examen: string }> =
      Array.isArray(req.body) ? req.body : [req.body];

    if (items.length === 0 || !items[0].seccion || !items[0].codigo_examen) {
      res.status(400).json({ success: false, message: 'Seccion y codigo_examen son requeridos' });
      return;
    }

    // Trim + deduplicar
    const deduped = [...new Map(
      items.map((x) => [
        `${x.seccion.trim()}|${x.codigo_examen.trim()}`,
        { seccion: x.seccion.trim(), codigo_examen: x.codigo_examen.trim() },
      ])
    ).values()];

    const CHUNK = 200;
    for (let i = 0; i < deduped.length; i += CHUNK) {
      const chunk = deduped.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, j) =>
        `($${j * 2 + 1}, $${j * 2 + 2})`
      ).join(', ');
      const params = chunk.flatMap((x) => [x.seccion, x.codigo_examen]);
      await pool.query(
        `DELETE FROM tiempos_entrega.examenes_excluidos
         WHERE (seccion, codigo_examen) IN (VALUES ${placeholders})`,
        params
      );
    }

    res.json({ success: true, count: deduped.length });
  } catch (err) {
    console.error('Delete exclusion error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
