"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "./FileUpload";
import { UploadedFile, FileAttachment, FileType } from "@/types/chat";
import { uploadFile } from "@/lib/api";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (content: string, attachments: FileAttachment[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  isStreaming = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  const handleUpload = useCallback(async (file: File): Promise<UploadedFile> => {
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(file);
      return uploaded;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmedMessage = message.trim();
      if (!trimmedMessage && files.length === 0) return;
      if (disabled || isStreaming) return;

      // Convert uploaded files to attachments
      const attachments: FileAttachment[] = files.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type as FileType,
        url: f.url,
        mime_type: f.mime_type,
      }));

      onSendMessage(trimmedMessage, attachments);
      setMessage("");
      setFiles([]);
    },
    [message, files, disabled, isStreaming, onSendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isDisabled = disabled || isStreaming || isUploading;

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-4">
      <div className="mx-auto max-w-3xl">
        {/* File previews */}
        {files.length > 0 && (
          <div className="mb-2">
            <FileUpload
              files={files}
              onFilesChange={setFiles}
              onUpload={handleUpload}
              disabled={isDisabled}
              isUploading={isUploading}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File upload button */}
          {files.length === 0 && (
            <FileUpload
              files={files}
              onFilesChange={setFiles}
              onUpload={handleUpload}
              disabled={isDisabled}
              isUploading={isUploading}
            />
          )}

          {/* Message input */}
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift+Enter for new line)"
              disabled={isDisabled}
              className="min-h-[44px] max-h-[200px] resize-none pr-12"
              rows={1}
            />
          </div>

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            disabled={isDisabled || (!message.trim() && files.length === 0)}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Powered by Gemini 3 Pro Preview. Upload images or PDFs to discuss them.
        </p>
      </div>
    </form>
  );
}
