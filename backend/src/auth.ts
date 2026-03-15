import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
