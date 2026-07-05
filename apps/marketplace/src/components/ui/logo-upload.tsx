"use client";

import { useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { storageUtils } from "@/utils/storage/storageUtils";
import { useToast } from "@/hooks/useToast";

interface LogoUploadProps {
  bucket: string;
  currentLogoUrl?: string;
  currentLogoPath?: string;
  onUploadSuccess?: (url: string, path: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function LogoUpload({
  bucket,
  currentLogoUrl,
  currentLogoPath,
  onUploadSuccess,
  maxSizeMB = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
}: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(currentLogoUrl);
  const [logoPath, setLogoPath] = useState<string | undefined>(currentLogoPath);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload an image file (${acceptedTypes.join(", ")})`,
        variant: "destructive",
      });
      return false;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `Please upload an image smaller than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) return;

    setIsUploading(true);

    try {
      const newPath = storageUtils.generateUniquePath(file.name, "logos");

      let result;
      
      // If there's an existing logo, replace it
      if (logoPath) {
        result = await storageUtils.replace({
          file,
          bucket,
          path: newPath,
        });
      } else {
        result = await storageUtils.upload({
          file,
          bucket,
          path: newPath,
        });
      }

      if (result.success && result.url) {
        setLogoUrl(result.url);
        setLogoPath(newPath);
        
        toast({
          title: "Success",
          description: "Logo uploaded successfully",
        });

        onUploadSuccess?.(result.url, newPath);
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to upload logo",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (!logoPath) return;

    setIsUploading(true);

    try {
      const result = await storageUtils.delete({
        bucket,
        path: logoPath,
      });

      if (result.success) {
        setLogoUrl(undefined);
        setLogoPath(undefined);
        
        toast({
          title: "Success",
          description: "Logo removed successfully",
        });

        onUploadSuccess?.("", "");
      } else {
        toast({
          title: "Delete failed",
          description: result.error || "Failed to remove logo",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Logo Preview */}
        <div className="relative group">
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
                {/* Overlay on hover */}
                <label
                  htmlFor="logo-upload"
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-white" />
                  <input
                    id="logo-upload"
                    type="file"
                    accept={acceptedTypes.join(",")}
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </>
            ) : (
              <label
                htmlFor="logo-upload"
                className="w-full h-full cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ImageIcon className="w-12 h-12 mb-2" />
                <span className="text-sm">Upload Logo</span>
                <input
                  id="logo-upload"
                  type="file"
                  accept={acceptedTypes.join(",")}
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Remove Button */}
          {logoUrl && (
            <button
              onClick={handleRemove}
              disabled={isUploading}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove logo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="flex-1 text-sm text-gray-600">
          <p className="font-medium mb-1">Logo Upload</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Click to upload a new logo</li>
            <li>Maximum size: {maxSizeMB}MB</li>
            <li>Formats: JPG, PNG, WebP, SVG</li>
            {logoUrl && <li>Click the X button to remove</li>}
          </ul>
        </div>
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
