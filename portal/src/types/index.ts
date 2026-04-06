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
  puede_editar_metas?: boolean;
  puede_editar_examenes?: boolean;
}

export interface AutomatizacionPermission {
  id: number;
  nombre: string;
  puede_cargar: boolean;
  puede_editar_metas: boolean;
  puede_editar_examenes: boolean;
}

export interface UserDetail extends User {
  activo: boolean;
  created_at: string;
  automatizaciones: AutomatizacionPermission[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface MetaSeccion {
  seccion: string;
  tipo: string;
  meta_default: number;
  overrides: MetaPeriodo[];
}

export interface MetaPeriodo {
  mes: string;
  meta_dias: number;
}

export interface ExamenExcluido {
  id?: number;
  seccion: string;
  codigo_examen: string;
  nombre_examen: string;
  motivo: string;
}

export interface ConfigTolerancia {
  id?: number;
  nombre: string;
  anio: number | null;
  mes: string | null;
  umbral_en_rango: number;
  umbral_alerta: number;
  umbral_critico: number;
  umbral_dias_cumple: number;
  umbral_dias_alerta: number;
  umbral_dias_critico: number;
}
