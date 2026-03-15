import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileWarning } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  acceptedExtensions: string[];
  maxFiles: number;
  disabled?: boolean;
}

export default function DropZone({
  onFilesAdded,
  acceptedExtensions,
  maxFiles,
  disabled = false,
}: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesAdded(acceptedFiles);
      }
    },
    [onFilesAdded],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      disabled,
      maxFiles,
      accept: acceptedExtensions.reduce(
        (acc, ext) => {
          if (ext === '.xls') {
            acc['application/vnd.ms-excel'] = ['.xls'];
          }
          if (ext === '.xlsx') {
            acc['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] =
              ['.xlsx'];
          }
          if (ext === '.csv') {
            acc['text/csv'] = ['.csv'];
          }
          return acc;
        },
        {} as Record<string, string[]>,
      ),
    });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
            : isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload
          className={`mb-3 h-10 w-10 ${isDragActive ? 'text-blue-500' : 'text-slate-400'}`}
        />
        {isDragActive ? (
          <p className="text-sm font-medium text-blue-600">
            Suelte los archivos aqui...
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">
              Arrastre archivos aqui o haga clic para seleccionar
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {acceptedExtensions.join(', ')} &middot; Maximo {maxFiles}{' '}
              {maxFiles === 1 ? 'archivo' : 'archivos'}
            </p>
          </>
        )}
      </div>

      {fileRejections.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <FileWarning className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            {fileRejections.map(({ file, errors }) => (
              <p key={file.name}>
                <span className="font-medium">{file.name}</span>:{' '}
                {errors.map((e) => e.message).join(', ')}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
