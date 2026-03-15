import { useState, useCallback } from 'react';
import type { FileWithStatus, UploadResponse } from '../types';

export function useFileUpload(webhookPath: string) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const items: FileWithStatus[] = newFiles.map((file) => ({
      file,
      id: crypto.randomUUID(),
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const processFiles = useCallback(async () => {
    setIsProcessing(true);

    const pending = files.filter((f) => f.status === 'pending');

    for (const fileItem of pending) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: 'uploading' as const } : f,
        ),
      );

      try {
        const formData = new FormData();
        formData.append('data', fileItem.file);

        const response = await fetch(webhookPath, {
          method: 'POST',
          body: formData,
        });

        let result: UploadResponse;

        if (response.ok) {
          result = await response.json();
        } else {
          result = {
            success: false,
            message: `Error del servidor (${response.status})`,
          };
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: result.success ? 'success' : 'error',
                  message: result.message,
                }
              : f,
          ),
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: 'error' as const,
                  message: 'Error de conexion con el servidor',
                }
              : f,
          ),
        );
      }
    }

    setIsProcessing(false);
  }, [files, webhookPath]);

  const stats = {
    total: files.length,
    pending: files.filter((f) => f.status === 'pending').length,
    success: files.filter((f) => f.status === 'success').length,
    error: files.filter((f) => f.status === 'error').length,
    uploading: files.filter((f) => f.status === 'uploading').length,
  };

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    processFiles,
    isProcessing,
    stats,
  };
}
