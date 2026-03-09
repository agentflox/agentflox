"use client";

import { useId, useState } from "react";
import { Upload, X } from "lucide-react";
import { storageUtils } from "@/utils/storage/storageUtils";
import { useToast } from "@/hooks/useToast";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

interface MultiFileUploadProps {
  bucket: string;
  pathPrefix?: string;
  onFilesChange?: (files: UploadedFile[]) => void;
  maxSizeMB?: number;
  maxFiles?: number;
  acceptedTypes?: string[];
  initialFiles?: UploadedFile[];
  hideList?: boolean;
}

export function MultiFileUpload({
  bucket,
  pathPrefix = "files",
  onFilesChange,
  maxSizeMB = 10,
  maxFiles = 10,
  acceptedTypes,
  initialFiles = [],
  hideList = false,
}: MultiFileUploadProps) {
  const uploadId = useId();
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (acceptedTypes && !acceptedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `File type ${file.type} is not allowed`,
        variant: "destructive",
      });
      return false;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `${file.name} is larger than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = selectedFiles.filter(validateFile);
    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const path = storageUtils.generateUniquePath(file.name, pathPrefix);

        const result = await storageUtils.upload({
          file,
          bucket,
          path,
        });

        if (result.success && result.url) {
          return {
            id: path,
            name: file.name,
            url: result.url,
            path,
            size: file.size,
            type: file.type,
          };
        }

        throw new Error(result.error || "Upload failed");
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const newFiles = [...files, ...uploadedFiles];

      setFiles(newFiles);
      onFilesChange?.(newFiles);

      toast({
        title: "Success",
        description: `${uploadedFiles.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async (fileToRemove: UploadedFile) => {
    try {
      const result = await storageUtils.delete({
        bucket,
        path: fileToRemove.path,
      });

      if (result.success) {
        const newFiles = files.filter((f) => f.id !== fileToRemove.id);
        setFiles(newFiles);
        onFilesChange?.(newFiles);

        toast({
          title: "Success",
          description: "File removed successfully",
        });
      } else {
        toast({
          title: "Delete failed",
          description: result.error || "Failed to remove file",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎥";
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    return "📎";
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
        <label
          htmlFor={uploadId}
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          <Upload className="w-12 h-12 text-gray-400 mb-3" />
          <span className="text-sm font-medium text-gray-700 mb-1">
            Click to upload files
          </span>
          <span className="text-xs text-gray-500">
            {files.length}/{maxFiles} files • Max {maxSizeMB}MB per file
          </span>
          <input
            id={uploadId}
            type="file"
            multiple
            accept={acceptedTypes?.join(",")}
            onChange={handleFileChange}
            disabled={isUploading || files.length >= maxFiles}
            className="hidden"
          />
        </label>
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span>Uploading files...</span>
        </div>
      )}

      {/* Files List */}
      {!hideList && files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Uploaded Files ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors min-w-0"
              >
                {/* File Icon */}
                <div className="text-2xl flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0 inline-grid">
                  <p className="w-full text-sm font-medium text-gray-900 truncate whitespace-nowrap" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleRemove(file)}
                    className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
