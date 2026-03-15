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
             json_build_object('id', a.id, 'nombre', a.nombre)
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
    const { id, username, nombre, password, es_admin, activo, automatizacion_ids } = req.body;

    if (!username?.trim() || !nombre?.trim()) {
      res.status(400).json({ success: false, message: 'Usuario y nombre son requeridos' });
      return;
    }

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
      if (automatizacion_ids?.length > 0) {
        const values = automatizacion_ids.map((_: number, i: number) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO portal_config.usuario_automatizacion (usuario_id, automatizacion_id) VALUES ${values}`,
          [id, ...automatizacion_ids]
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

      if (automatizacion_ids?.length > 0) {
        const values = automatizacion_ids.map((_: number, i: number) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO portal_config.usuario_automatizacion (usuario_id, automatizacion_id) VALUES ${values}`,
          [newId, ...automatizacion_ids]
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
