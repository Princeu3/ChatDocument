"use client";

import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadedFile } from "@/types/chat";
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onUpload: (file: File) => Promise<UploadedFile>;
  disabled?: boolean;
  isUploading?: boolean;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function FileUpload({
  files,
  onFilesChange,
  onUpload,
  disabled = false,
  isUploading = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);

      for (const file of selectedFiles) {
        // Validate file type
        if (!ACCEPTED_TYPES.includes(file.type)) {
          alert(
            `File type not supported: ${file.name}. Please upload images (JPEG, PNG, GIF, WebP) or PDFs.`
          );
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          alert(`File too large: ${file.name}. Maximum size is 25MB.`);
          continue;
        }

        try {
          // Create preview for images
          let preview: string | undefined;
          if (file.type.startsWith("image/")) {
            preview = URL.createObjectURL(file);
          }

          // Upload file
          const uploadedFile = await onUpload(file);
          uploadedFile.preview = preview;

          onFilesChange([...files, uploadedFile]);
        } catch (error) {
          console.error("Upload failed:", error);
          alert(`Failed to upload ${file.name}`);
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files, onFilesChange, onUpload]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const fileToRemove = files.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      onFilesChange(files.filter((f) => f.id !== fileId));
    },
    [files, onFilesChange]
  );

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Attach files (images or PDFs)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              {file.type === "image" ? (
                file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-6 w-6 rounded object-cover"
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                )
              ) : (
                <FileText className="h-4 w-4 text-red-500" />
              )}
              <span className="max-w-[100px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
