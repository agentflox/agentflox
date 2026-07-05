import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";

export interface UploadOptions {
  file: File;
  bucket: string;
  path: string;
  upsert?: boolean;
}

export interface DeleteOptions {
  bucket: string;
  path: string;
}

export interface StorageResult {
  success: boolean;
  url?: string;
  error?: string;
}

class StorageUtils {
  /**
   * Upload a file to Supabase storage
   */
  async upload({ file, bucket, path, upsert = false }: UploadOptions): Promise<StorageResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert,
          contentType: file.type,
        });

      if (error) {
        console.error("Upload error:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error("Upload exception:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Replace an existing file (delete old, upload new)
   */
  async replace({ file, bucket, path }: UploadOptions): Promise<StorageResult> {
    try {
      // First, delete the old file
      const deleteResult = await this.delete({ bucket, path });
      
      // Upload the new file (using upsert in case delete failed)
      const uploadResult = await this.upload({ 
        file, 
        bucket, 
        path, 
        upsert: true 
      });

      return uploadResult;
    } catch (error) {
      console.error("Replace exception:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Delete a file from Supabase storage
   */
  async delete({ bucket, path }: DeleteOptions): Promise<StorageResult> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error("Delete error:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Delete exception:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Generate a unique file path
   */
  generateUniquePath(originalFileName: string, prefix?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalFileName.split(".").pop();
    const baseName = originalFileName.replace(`.${extension}`, "");
    
    const sanitizedBaseName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);

    const fileName = `${sanitizedBaseName}-${timestamp}-${randomString}.${extension}`;
    
    return prefix ? `${prefix}/${fileName}` : fileName;
  }
}

export const storageUtils = new StorageUtils();
