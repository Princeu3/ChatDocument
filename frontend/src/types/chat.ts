export type MessageRole = "user" | "assistant";

export type FileType = "image" | "pdf";

export interface FileAttachment {
  id: string;
  name: string;
  type: FileType;
  url: string;
  mime_type: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  attachments: FileAttachment[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface WebSocketMessage {
  type:
    | "message_saved"
    | "stream_start"
    | "stream_chunk"
    | "stream_end"
    | "title_updated"
    | "error"
    | "pong";
  data: Record<string, unknown>;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  mime_type: string;
  file?: File;
  preview?: string;
}
