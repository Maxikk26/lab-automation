export type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface FileWithStatus {
  file: File;
  id: string;
  status: FileStatus;
  message?: string;
}

export interface WorkflowConfig {
  id: number;
  nombre: string;
  descripcion: string;
  instrucciones: string;
  webhook_path: string;
  extensiones: string[];
  max_archivos: number;
  icono: string;
  orden: number;
  categoria: string | null;
  categoria_icono: string | null;
  categoria_orden: number | null;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  details?: {
    seccion?: string;
    periodo?: string;
    totalExamenes?: number;
    totalSecciones?: number;
  };
}

export interface User {
  id: number;
  username: string;
  nombre: string;
  es_admin: boolean;
}

export interface UserDetail extends User {
  activo: boolean;
  created_at: string;
  automatizaciones: { id: number; nombre: string }[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
