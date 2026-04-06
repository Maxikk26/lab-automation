import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authenticate, requireAdmin } from '../auth.js';

const router = Router();

router.get('/admin/usuarios', authenticate, requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.username, u.nombre, u.es_admin, u.activo, u.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', a.id,
               'nombre', a.nombre,
               'puede_cargar', ua.puede_cargar,
               'puede_editar_metas', ua.puede_editar_metas,
               'puede_editar_examenes', ua.puede_editar_examenes
             )
           ) FILTER (WHERE a.id IS NOT NULL),
           '[]'
         ) AS automatizaciones
       FROM portal_config.usuarios u
       LEFT JOIN portal_config.usuario_automatizacion ua ON ua.usuario_id = u.id
       LEFT JOIN portal_config.automatizaciones a ON a.id = ua.automatizacion_id
       GROUP BY u.id
       ORDER BY u.nombre`
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

router.post('/admin/usuarios/save', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, username, nombre, password, es_admin, activo, automatizaciones, automatizacion_ids } = req.body;

    if (!username?.trim() || !nombre?.trim()) {
      res.status(400).json({ success: false, message: 'Usuario y nombre son requeridos' });
      return;
    }

    // Soporte para formato nuevo (automatizaciones con permisos) y legacy (automatizacion_ids)
    const perms: Array<{ id: number; puede_cargar: boolean; puede_editar_metas: boolean; puede_editar_examenes: boolean }> =
      automatizaciones ?? (automatizacion_ids || []).map((aid: number) => ({
        id: aid, puede_cargar: true, puede_editar_metas: false, puede_editar_examenes: false,
      }));

    await client.query('BEGIN');

    if (id) {
      // Update
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await client.query(
          `UPDATE portal_config.usuarios
           SET username = $1, nombre = $2, pwd_hash = $3, es_admin = $4, activo = $5, updated_at = NOW()
           WHERE id = $6`,
          [username, nombre, hash, es_admin ?? false, activo !== false, id]
        );
      } else {
        await client.query(
          `UPDATE portal_config.usuarios
           SET username = $1, nombre = $2, es_admin = $3, activo = $4, updated_at = NOW()
           WHERE id = $5`,
          [username, nombre, es_admin ?? false, activo !== false, id]
        );
      }

      // Update permissions
      await client.query(
        'DELETE FROM portal_config.usuario_automatizacion WHERE usuario_id = $1',
        [id]
      );
      for (const p of perms) {
        await client.query(
          `INSERT INTO portal_config.usuario_automatizacion
             (usuario_id, automatizacion_id, puede_cargar, puede_editar_metas, puede_editar_examenes)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, p.id, p.puede_cargar !== false, p.puede_editar_metas === true, p.puede_editar_examenes === true]
        );
      }
    } else {
      // Create
      if (!password) {
        res.status(400).json({ success: false, message: 'Contraseña requerida para nuevo usuario' });
        await client.query('ROLLBACK');
        return;
      }

      const hash = await bcrypt.hash(password, 10);
      const { rows } = await client.query(
        `INSERT INTO portal_config.usuarios (username, pwd_hash, nombre, es_admin)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [username, hash, nombre, es_admin ?? false]
      );
      const newId = rows[0].id;

      for (const p of perms) {
        await client.query(
          `INSERT INTO portal_config.usuario_automatizacion
             (usuario_id, automatizacion_id, puede_cargar, puede_editar_metas, puede_editar_examenes)
           VALUES ($1, $2, $3, $4, $5)`,
          [newId, p.id, p.puede_cargar !== false, p.puede_editar_metas === true, p.puede_editar_examenes === true]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Usuario guardado correctamente' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(400).json({ success: false, message: 'El nombre de usuario ya existe' });
      return;
    }
    console.error('Save user error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  } finally {
    client.release();
  }
});

router.post('/admin/usuarios/delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ success: false, message: 'ID requerido' });
      return;
    }

    await pool.query(
      `UPDATE portal_config.usuarios SET activo = false, updated_at = NOW()
       WHERE id = $1 AND username != 'admin'`,
      [id]
    );

    res.json({ success: true, message: 'Usuario desactivado' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
