import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requirePermission } from '../auth.js';

const router = Router();

// Catálogo de secciones (para dropdowns en el portal)
router.get('/secciones', authenticate, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, tipo FROM tiempos_entrega.secciones ORDER BY tipo, nombre`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch secciones error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Lista secciones con meta default + overrides por año
router.get('/metas', authenticate, async (req, res) => {
  try {
    const anio = parseInt(req.query.anio as string) || new Date().getFullYear();

    const { rows } = await pool.query(
      `SELECT s.nombre AS seccion, ms.meta_dias AS meta_default, s.tipo,
              mp.mes, mp.meta_dias AS meta_override
       FROM tiempos_entrega.metas_seccion ms
       JOIN tiempos_entrega.secciones s ON s.id = ms.seccion_id
       LEFT JOIN tiempos_entrega.metas_periodo mp
           ON mp.seccion_id = ms.seccion_id AND mp.anio = $1
       ORDER BY s.tipo, s.nombre, mp.mes`,
      [anio]
    );

    // Agrupar por sección
    const map = new Map<string, any>();
    for (const row of rows) {
      if (!map.has(row.seccion)) {
        map.set(row.seccion, {
          seccion: row.seccion,
          tipo: row.tipo,
          meta_default: parseFloat(row.meta_default),
          overrides: [],
        });
      }
      if (row.mes && row.meta_override != null) {
        map.get(row.seccion).overrides.push({
          mes: row.mes,
          meta_dias: parseFloat(row.meta_override),
        });
      }
    }

    res.json({ success: true, data: Array.from(map.values()) });
  } catch (err) {
    console.error('Fetch metas error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Actualizar meta global (default) de una sección
router.post('/admin/metas/default', authenticate, requirePermission('puede_editar_metas'), async (req, res) => {
  try {
    const { seccion, meta_dias } = req.body;
    if (!seccion || meta_dias == null) {
      res.status(400).json({ success: false, message: 'Seccion y meta_dias son requeridos' });
      return;
    }

    await pool.query(
      `UPDATE tiempos_entrega.metas_seccion
       SET meta_dias = $1, updated_at = NOW()
       WHERE seccion_id = (
           SELECT id FROM tiempos_entrega.secciones
           WHERE nombre_norm = UPPER(TRIM(unaccent($2)))
       )`,
      [meta_dias, seccion]
    );

    res.json({ success: true, message: 'Meta default actualizada' });
  } catch (err) {
    console.error('Update meta default error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Crear/actualizar override de meta para un mes específico
router.post('/admin/metas/periodo', authenticate, requirePermission('puede_editar_metas'), async (req, res) => {
  try {
    const { seccion, anio, mes, meta_dias } = req.body;
    if (!seccion || !anio || !mes || meta_dias == null) {
      res.status(400).json({ success: false, message: 'Seccion, anio, mes y meta_dias son requeridos' });
      return;
    }

    await pool.query(
      `INSERT INTO tiempos_entrega.metas_periodo (seccion, seccion_id, anio, mes, meta_dias)
       VALUES ($1,
               (SELECT id FROM tiempos_entrega.secciones WHERE nombre_norm = UPPER(TRIM(unaccent($1)))),
               $2, $3, $4)
       ON CONFLICT (seccion, anio, mes)
       DO UPDATE SET meta_dias = EXCLUDED.meta_dias,
                     seccion_id = EXCLUDED.seccion_id,
                     updated_at = NOW()`,
      [seccion, anio, mes, meta_dias]
    );

    res.json({ success: true, message: 'Meta de periodo guardada' });
  } catch (err) {
    console.error('Save meta periodo error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Eliminar override de meta (vuelve a heredar del default)
router.post('/admin/metas/periodo/delete', authenticate, requirePermission('puede_editar_metas'), async (req, res) => {
  try {
    const { seccion, anio, mes } = req.body;
    if (!seccion || !anio || !mes) {
      res.status(400).json({ success: false, message: 'Seccion, anio y mes son requeridos' });
      return;
    }

    await pool.query(
      `DELETE FROM tiempos_entrega.metas_periodo
       WHERE seccion_id = (
           SELECT id FROM tiempos_entrega.secciones
           WHERE nombre_norm = UPPER(TRIM(unaccent($1)))
       )
       AND anio = $2 AND mes = $3`,
      [seccion, anio, mes]
    );

    res.json({ success: true, message: 'Override eliminado' });
  } catch (err) {
    console.error('Delete meta periodo error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
