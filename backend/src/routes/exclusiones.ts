import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requirePermission } from '../auth.js';

const router = Router();

// Lista exámenes excluidos, opcionalmente filtrados por sección
router.get('/exclusiones', authenticate, async (req, res) => {
  try {
    const seccion = req.query.seccion as string | undefined;

    let query = `SELECT id, seccion, codigo_examen, nombre_examen, motivo
                 FROM tiempos_entrega.examenes_excluidos`;
    const params: any[] = [];

    if (seccion) {
      query += ` WHERE UPPER(TRIM(seccion)) = UPPER(TRIM($1))`;
      params.push(seccion);
    }

    query += ` ORDER BY seccion, codigo_examen`;
    const { rows } = await pool.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch exclusiones error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Agregar/actualizar exclusión
router.post('/admin/exclusiones/save', authenticate, requirePermission('puede_editar_examenes'), async (req, res) => {
  try {
    const { seccion, codigo_examen, nombre_examen, motivo } = req.body;
    if (!seccion || !codigo_examen) {
      res.status(400).json({ success: false, message: 'Seccion y codigo_examen son requeridos' });
      return;
    }

    await pool.query(
      `INSERT INTO tiempos_entrega.examenes_excluidos (seccion, codigo_examen, nombre_examen, motivo)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (seccion, codigo_examen)
       DO UPDATE SET nombre_examen = EXCLUDED.nombre_examen, motivo = EXCLUDED.motivo`,
      [seccion, codigo_examen, nombre_examen || null, motivo || null]
    );

    res.json({ success: true, message: 'Exclusion guardada' });
  } catch (err) {
    console.error('Save exclusion error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Eliminar exclusión
router.post('/admin/exclusiones/delete', authenticate, requirePermission('puede_editar_examenes'), async (req, res) => {
  try {
    const { seccion, codigo_examen } = req.body;
    if (!seccion || !codigo_examen) {
      res.status(400).json({ success: false, message: 'Seccion y codigo_examen son requeridos' });
      return;
    }

    await pool.query(
      `DELETE FROM tiempos_entrega.examenes_excluidos WHERE seccion = $1 AND codigo_examen = $2`,
      [seccion, codigo_examen]
    );

    res.json({ success: true, message: 'Exclusion eliminada' });
  } catch (err) {
    console.error('Delete exclusion error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
