import { Router } from 'express';
import pool from '../db.js';
import { authenticate, type TokenPayload } from '../auth.js';

const router = Router();

router.get('/automatizaciones', authenticate, async (req, res) => {
  try {
    const user = (req as any).user as TokenPayload;

    const { rows } = await pool.query(
      `SELECT
         a.id, a.nombre, a.descripcion, a.instrucciones,
         a.webhook_path, a.extensiones, a.max_archivos, a.icono, a.orden,
         c.nombre AS categoria, c.icono AS categoria_icono, c.orden AS categoria_orden
       FROM portal_config.automatizaciones a
       LEFT JOIN portal_config.categorias c ON c.id = a.categoria_id
       WHERE a.activo = true
         AND ($1::boolean = true OR a.id IN (
           SELECT automatizacion_id FROM portal_config.usuario_automatizacion
           WHERE usuario_id = $2
         ))
       ORDER BY c.orden, a.orden`,
      [user.es_admin, user.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Automatizaciones error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
