import { Conversation, Message, UploadedFile } from "@/types/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// Conversation API
export async function getConversations(): Promise<Conversation[]> {
  return fetchApi<Conversation[]>("/api/conversations");
}

export async function createConversation(
  title?: string
): Promise<Conversation> {
  return fetchApi<Conversation>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: title || "New Conversation" }),
  });
}

export async function getConversation(id: string): Promise<Conversation> {
  return fetchApi<Conversation>(`/api/conversations/${id}`);
}

export async function updateConversation(
  id: string,
  title: string
): Promise<Conversation> {
  return fetchApi<Conversation>(`/api/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await fetchApi(`/api/conversations/${id}`, {
    method: "DELETE",
  });
}

// Message API
export async function getMessages(conversationId: string): Promise<Message[]> {
  return fetchApi<Message[]>(`/api/conversations/${conversationId}/messages`);
}

// File Upload API
export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Upload error: ${response.status}`);
  }

  return response.json();
}
