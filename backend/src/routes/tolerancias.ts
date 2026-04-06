import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requirePermission } from '../auth.js';

const router = Router();

// Obtener configuración de tolerancias (global + por periodo)
router.get('/tolerancias', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, anio, mes,
              umbral_en_rango, umbral_alerta, umbral_critico,
              umbral_dias_cumple, umbral_dias_alerta, umbral_dias_critico
       FROM tiempos_entrega.config_tolerancias
       ORDER BY COALESCE(anio, 0), COALESCE(mes, '')`
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch tolerancias error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Crear/actualizar configuración de tolerancias
router.post('/admin/tolerancias/save', authenticate, requirePermission('puede_editar_metas'), async (req, res) => {
  try {
    const {
      anio, mes,
      umbral_en_rango, umbral_alerta, umbral_critico,
      umbral_dias_cumple, umbral_dias_alerta, umbral_dias_critico,
    } = req.body;

    if (umbral_en_rango == null || umbral_alerta == null || umbral_critico == null
        || umbral_dias_cumple == null || umbral_dias_alerta == null || umbral_dias_critico == null) {
      res.status(400).json({ success: false, message: 'Todos los umbrales son requeridos' });
      return;
    }

    const nombre = (anio && mes) ? `${mes} ${anio}` : 'default';

    // Upsert usando el unique index con COALESCE
    await pool.query(
      `INSERT INTO tiempos_entrega.config_tolerancias
         (nombre, anio, mes, umbral_en_rango, umbral_alerta, umbral_critico,
          umbral_dias_cumple, umbral_dias_alerta, umbral_dias_critico)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ((COALESCE(anio, 0)), (COALESCE(mes, 'ALL')))
       DO UPDATE SET
         umbral_en_rango = EXCLUDED.umbral_en_rango,
         umbral_alerta = EXCLUDED.umbral_alerta,
         umbral_critico = EXCLUDED.umbral_critico,
         umbral_dias_cumple = EXCLUDED.umbral_dias_cumple,
         umbral_dias_alerta = EXCLUDED.umbral_dias_alerta,
         umbral_dias_critico = EXCLUDED.umbral_dias_critico,
         updated_at = NOW()`,
      [nombre, anio || null, mes || null,
       umbral_en_rango, umbral_alerta, umbral_critico,
       umbral_dias_cumple, umbral_dias_alerta, umbral_dias_critico]
    );

    res.json({ success: true, message: 'Tolerancias guardadas' });
  } catch (err) {
    console.error('Save tolerancias error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
