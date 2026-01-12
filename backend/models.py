from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class FileType(str, Enum):
    IMAGE = "image"
    PDF = "pdf"


class FileAttachment(BaseModel):
    id: str
    name: str
    type: FileType
    url: str
    mime_type: str


class Message(BaseModel):
    id: str
    conversation_id: str
    role: MessageRole
    content: str
    attachments: List[FileAttachment] = []
    created_at: datetime


class Conversation(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Conversation"


class SendMessageRequest(BaseModel):
    content: str
    attachments: List[FileAttachment] = []


class WebSocketMessage(BaseModel):
    type: str  # "message", "stream_start", "stream_chunk", "stream_end", "error"
    data: dict


class ChatRequest(BaseModel):
    conversation_id: str
    content: str
    attachments: List[FileAttachment] = []
