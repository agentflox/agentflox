"use client";

import { MultiFileUpload } from "./files-upload";

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

interface MediaUploadProps {
  bucket: string;
  pathPrefix?: string;
  onChange?: (media: MediaFile[]) => void;
  maxSizeMB?: number;
  maxFiles?: number;
  initialMedia?: MediaFile[];
}

export function MediaUpload({
  bucket,
  pathPrefix = "media",
  onChange,
  maxSizeMB = 50,
  maxFiles = 6,
  initialMedia = [],
}: MediaUploadProps) {
  return (
    <MultiFileUpload
      bucket={bucket}
      pathPrefix={pathPrefix}
      onFilesChange={onChange}
      maxSizeMB={maxSizeMB}
      maxFiles={maxFiles}
      initialFiles={initialMedia}
      acceptedTypes={["image/png","image/jpeg","image/webp","image/gif","image/svg+xml","video/mp4","video/webm","video/quicktime"]}
    />
  );
}


