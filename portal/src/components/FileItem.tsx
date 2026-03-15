import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';
import type { FileWithStatus } from '../types';

interface FileItemProps {
  fileItem: FileWithStatus;
  onRemove?: (id: string) => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    label: 'Pendiente',
  },
  uploading: {
    icon: Loader2,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    label: 'Procesando...',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: 'Procesado',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    label: 'Error',
  },
};

export default function FileItem({ fileItem, onRemove }: FileItemProps) {
  const config = statusConfig[fileItem.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
        fileItem.status === 'error'
          ? 'border-red-200 bg-red-50'
          : fileItem.status === 'success'
            ? 'border-emerald-200 bg-emerald-50'
            : fileItem.status === 'uploading'
              ? 'border-blue-200 bg-blue-50'
              : 'border-slate-200 bg-white'
      }`}
    >
      <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-slate-500" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">
          {fileItem.file.name}
        </p>
        {fileItem.message && (
          <p
            className={`mt-0.5 text-xs ${fileItem.status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {fileItem.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        <StatusIcon
          className={`h-5 w-5 ${config.color} ${fileItem.status === 'uploading' ? 'animate-spin' : ''}`}
        />
      </div>

      {fileItem.status === 'pending' && onRemove && (
        <button
          onClick={() => onRemove(fileItem.id)}
          className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
