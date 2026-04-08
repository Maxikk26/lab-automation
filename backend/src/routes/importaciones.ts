import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../auth.js';

const router = Router();

// Log de importaciones — solo accesible para usuarios autenticados
router.get('/importaciones/log', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const estado = req.query.estado as string | undefined;

    const params: any[] = [];
    let where = '';
    if (estado) {
      params.push(estado.toUpperCase());
      where = `WHERE estado = $1`;
    }
    params.push(limit);

    const { rows } = await pool.query(
      `SELECT id, archivo, webhook, periodo, estado, secciones_ok, examenes_ok, detalle, created_at
       FROM tiempos_entrega.log_importacion
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch importaciones log error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
