import json
import uuid
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from models import (
    Conversation,
    Message,
    MessageRole,
    FileAttachment,
    FileType,
    CreateConversationRequest,
)
from services.supabase_client import supabase_service
from services.chat_service import chat_service

app = FastAPI(title="Chat Document API", version="1.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_json(self, client_id: str, data: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(data)


manager = ConnectionManager()


# REST API Endpoints
@app.get("/")
async def root():
    return {"message": "Chat Document API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Conversation endpoints
@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation"""
    return supabase_service.create_conversation(request.title)


@app.get("/api/conversations", response_model=List[Conversation])
async def get_conversations():
    """Get all conversations"""
    return supabase_service.get_conversations()


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation"""
    conversation = supabase_service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.patch("/api/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, request: CreateConversationRequest):
    """Update conversation title"""
    conversation = supabase_service.update_conversation_title(
        conversation_id, request.title
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation"""
    success = supabase_service.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted"}


# Message endpoints
@app.get("/api/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(conversation_id: str):
    """Get all messages in a conversation"""
    return supabase_service.get_messages(conversation_id)


# File upload endpoint
class FileUploadResponse(BaseModel):
    id: str
    name: str
    type: str
    url: str
    mime_type: str


@app.post("/api/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a file (image or PDF)"""
    # Validate file type
    content_type = file.content_type or ""

    if content_type in settings.ALLOWED_IMAGE_TYPES:
        file_type = "image"
    elif content_type in settings.ALLOWED_DOCUMENT_TYPES:
        file_type = "pdf"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: images (JPEG, PNG, GIF, WebP) and PDFs",
        )

    # Read file content
    content = await file.read()

    # Check file size
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024*1024)}MB",
        )

    # Upload to Supabase storage
    file_id = str(uuid.uuid4())
    url = supabase_service.upload_file(content, file.filename or "file", content_type)

    return FileUploadResponse(
        id=file_id,
        name=file.filename or "file",
        type=file_type,
        url=url,
        mime_type=content_type,
    )


# WebSocket endpoint for chat
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "chat":
                conversation_id = data.get("conversation_id")
                content = data.get("content", "")
                attachments_data = data.get("attachments", [])

                # Parse attachments
                attachments = [
                    FileAttachment(
                        id=att["id"],
                        name=att["name"],
                        type=FileType(att["type"]),
                        url=att["url"],
                        mime_type=att["mime_type"],
                    )
                    for att in attachments_data
                ]

                # Get conversation history
                messages = supabase_service.get_messages(conversation_id)

                # Save user message
                user_message = supabase_service.add_message(
                    conversation_id=conversation_id,
                    role=MessageRole.USER,
                    content=content,
                    attachments=attachments,
                )

                # Send acknowledgment
                await manager.send_json(
                    client_id,
                    {
                        "type": "message_saved",
                        "data": {
                            "id": user_message.id,
                            "role": "user",
                            "content": content,
                        },
                    },
                )

                # Generate title for new conversations
                if len(messages) == 0:
                    title = await chat_service.generate_conversation_title(content)
                    supabase_service.update_conversation_title(conversation_id, title)
                    await manager.send_json(
                        client_id,
                        {
                            "type": "title_updated",
                            "data": {"conversation_id": conversation_id, "title": title},
                        },
                    )

                # Send stream start
                await manager.send_json(
                    client_id, {"type": "stream_start", "data": {}}
                )

                # Stream response
                full_response = ""
                try:
                    async for chunk in chat_service.generate_response_stream(
                        messages, content, attachments
                    ):
                        full_response += chunk
                        await manager.send_json(
                            client_id,
                            {"type": "stream_chunk", "data": {"content": chunk}},
                        )

                    # Save assistant message
                    assistant_message = supabase_service.add_message(
                        conversation_id=conversation_id,
                        role=MessageRole.ASSISTANT,
                        content=full_response,
                    )

                    # Send stream end
                    await manager.send_json(
                        client_id,
                        {
                            "type": "stream_end",
                            "data": {
                                "id": assistant_message.id,
                                "content": full_response,
                            },
                        },
                    )

                except Exception as e:
                    await manager.send_json(
                        client_id,
                        {"type": "error", "data": {"message": str(e)}},
                    )

            elif message_type == "ping":
                await manager.send_json(client_id, {"type": "pong", "data": {}})

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        manager.disconnect(client_id)
        print(f"WebSocket error: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
