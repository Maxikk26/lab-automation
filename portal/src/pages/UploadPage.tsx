import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Play, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFileUpload } from '../hooks/useFileUpload';
import DropZone from '../components/DropZone';
import FileItem from '../components/FileItem';

export default function UploadPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflows } = useAuth();
  const workflow = workflows.find((w) => w.id === Number(workflowId));

  const upload = useFileUpload(workflow?.webhook_path ?? '');

  if (!workflow) {
    return <Navigate to="/" replace />;
  }

  const hasFiles = upload.files.length > 0;
  const hasPending = upload.stats.pending > 0;
  const allDone =
    hasFiles && upload.stats.pending === 0 && !upload.isProcessing;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{workflow.nombre}</h1>
        <p className="mt-1 text-slate-600">{workflow.instrucciones}</p>
      </div>

      <DropZone
        onFilesAdded={upload.addFiles}
        acceptedExtensions={workflow.extensiones}
        maxFiles={workflow.max_archivos}
        disabled={upload.isProcessing}
      />

      {hasFiles && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Archivos ({upload.files.length})
            </h2>
            {!upload.isProcessing && (
              <button
                onClick={upload.clearFiles}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpiar todo
              </button>
            )}
          </div>

          <div className="space-y-2">
            {upload.files.map((f) => (
              <FileItem
                key={f.id}
                fileItem={f}
                onRemove={
                  !upload.isProcessing ? upload.removeFile : undefined
                }
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {hasPending && !upload.isProcessing && (
              <button
                onClick={upload.processFiles}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Play className="h-4 w-4" />
                Procesar {upload.stats.pending}{' '}
                {upload.stats.pending === 1 ? 'archivo' : 'archivos'}
              </button>
            )}

            {upload.isProcessing && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Procesando... ({upload.stats.success + upload.stats.error} /{' '}
                {upload.stats.total})
              </div>
            )}
          </div>

          {allDone && (
            <div
              className={`rounded-lg border p-4 ${
                upload.stats.error === 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {upload.stats.error === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-600" />
                )}
                <p className="text-sm font-medium">
                  {upload.stats.error === 0
                    ? `Todos los archivos fueron procesados exitosamente (${upload.stats.success}/${upload.stats.total})`
                    : `${upload.stats.success} procesados, ${upload.stats.error} con error`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
