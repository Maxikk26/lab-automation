import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { signToken } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT id, username, nombre, es_admin, pwd_hash
       FROM portal_config.usuarios
       WHERE username = $1 AND activo = true
       LIMIT 1`,
      [username]
    );

    if (rows.length === 0) {
      res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.pwd_hash);
    if (!valid) {
      res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
      return;
    }

    const payload = {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      es_admin: user.es_admin,
    };

    res.json({
      success: true,
      token: signToken(payload),
      user: payload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

export default router;
