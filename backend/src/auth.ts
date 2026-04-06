import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const SECRET = process.env.JWT_SECRET || 'lab-inmunoxxi-secret-change-me';
const EXPIRES_IN = '24h';

export interface TokenPayload {
  id: number;
  username: string;
  nombre: string;
  es_admin: boolean;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No autorizado' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalido o expirado' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as TokenPayload | undefined;
  if (!user?.es_admin) {
    res.status(403).json({ success: false, message: 'Requiere permisos de administrador' });
    return;
  }
  next();
}

export function requirePermission(permission: 'puede_editar_metas' | 'puede_editar_examenes') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user as TokenPayload | undefined;
    if (!user) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }
    if (user.es_admin) {
      next();
      return;
    }
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM portal_config.usuario_automatizacion
         WHERE usuario_id = $1 AND ${permission} = true
         LIMIT 1`,
        [user.id]
      );
      if (rows.length === 0) {
        res.status(403).json({ success: false, message: 'No tiene permisos para esta accion' });
        return;
      }
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  };
}
