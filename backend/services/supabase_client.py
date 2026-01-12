import re
import uuid
from typing import List, Optional
from datetime import datetime
from supabase import create_client, Client
from config import settings
from models import Conversation, Message, MessageRole, FileAttachment, FileType


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to be storage-safe"""
    # Get the extension
    parts = filename.rsplit(".", 1)
    name = parts[0]
    ext = parts[1] if len(parts) > 1 else ""

    # Replace spaces and special chars with underscores
    name = re.sub(r"[^\w\-]", "_", name)
    # Remove consecutive underscores
    name = re.sub(r"_+", "_", name)
    # Trim underscores from ends
    name = name.strip("_")

    return f"{name}.{ext}" if ext else name


class SupabaseService:
    _client: Client | None = None

    @property
    def client(self) -> Client:
        """Lazy initialization of Supabase client"""
        if self._client is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                raise ValueError(
                    "SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
                )
            self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return self._client

    # Conversation operations
    def create_conversation(self, title: str = "New Conversation") -> Conversation:
        conversation_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        data = {
            "id": conversation_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
        }

        result = self.client.table("conversations").insert(data).execute()

        return Conversation(
            id=result.data[0]["id"],
            title=result.data[0]["title"],
            created_at=result.data[0]["created_at"],
            updated_at=result.data[0]["updated_at"],
        )

    def get_conversations(self) -> List[Conversation]:
        result = (
            self.client.table("conversations")
            .select("*")
            .order("updated_at", desc=True)
            .execute()
        )

        return [
            Conversation(
                id=row["id"],
                title=row["title"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in result.data
        ]

    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        result = (
            self.client.table("conversations")
            .select("*")
            .eq("id", conversation_id)
            .execute()
        )

        if not result.data:
            return None

        row = result.data[0]
        return Conversation(
            id=row["id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def update_conversation_title(
        self, conversation_id: str, title: str
    ) -> Optional[Conversation]:
        now = datetime.utcnow().isoformat()

        result = (
            self.client.table("conversations")
            .update({"title": title, "updated_at": now})
            .eq("id", conversation_id)
            .execute()
        )

        if not result.data:
            return None

        row = result.data[0]
        return Conversation(
            id=row["id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def delete_conversation(self, conversation_id: str) -> bool:
        # Delete all messages first
        self.client.table("messages").delete().eq(
            "conversation_id", conversation_id
        ).execute()

        # Delete all attachments
        self.client.table("attachments").delete().eq(
            "conversation_id", conversation_id
        ).execute()

        # Delete conversation
        result = (
            self.client.table("conversations")
            .delete()
            .eq("id", conversation_id)
            .execute()
        )

        return len(result.data) > 0

    # Message operations
    def add_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
        attachments: List[FileAttachment] = [],
    ) -> Message:
        message_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        message_data = {
            "id": message_id,
            "conversation_id": conversation_id,
            "role": role.value,
            "content": content,
            "created_at": now,
        }

        result = self.client.table("messages").insert(message_data).execute()

        # Save attachments if any
        for attachment in attachments:
            attachment_data = {
                "id": attachment.id,
                "message_id": message_id,
                "conversation_id": conversation_id,
                "name": attachment.name,
                "type": attachment.type.value,
                "url": attachment.url,
                "mime_type": attachment.mime_type,
            }
            self.client.table("attachments").insert(attachment_data).execute()

        # Update conversation updated_at
        self.client.table("conversations").update({"updated_at": now}).eq(
            "id", conversation_id
        ).execute()

        return Message(
            id=message_id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            attachments=attachments,
            created_at=now,
        )

    def get_messages(self, conversation_id: str) -> List[Message]:
        # Get messages
        messages_result = (
            self.client.table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .execute()
        )

        # Get attachments
        attachments_result = (
            self.client.table("attachments")
            .select("*")
            .eq("conversation_id", conversation_id)
            .execute()
        )

        # Group attachments by message_id
        attachments_by_message = {}
        for att in attachments_result.data:
            msg_id = att["message_id"]
            if msg_id not in attachments_by_message:
                attachments_by_message[msg_id] = []
            attachments_by_message[msg_id].append(
                FileAttachment(
                    id=att["id"],
                    name=att["name"],
                    type=FileType(att["type"]),
                    url=att["url"],
                    mime_type=att["mime_type"],
                )
            )

        messages = []
        for row in messages_result.data:
            messages.append(
                Message(
                    id=row["id"],
                    conversation_id=row["conversation_id"],
                    role=MessageRole(row["role"]),
                    content=row["content"],
                    attachments=attachments_by_message.get(row["id"], []),
                    created_at=row["created_at"],
                )
            )

        return messages

    # File storage operations
    def upload_file(
        self, file_data: bytes, file_name: str, content_type: str
    ) -> str:
        """Upload file to Supabase storage and return URL"""
        file_id = str(uuid.uuid4())
        safe_name = sanitize_filename(file_name)
        file_path = f"uploads/{file_id}/{safe_name}"

        self.client.storage.from_("chat-files").upload(
            file_path, file_data, {"content-type": content_type}
        )

        # Get public URL
        url = self.client.storage.from_("chat-files").get_public_url(file_path)

        return url

    def delete_file(self, file_path: str) -> bool:
        """Delete file from Supabase storage"""
        result = self.client.storage.from_("chat-files").remove([file_path])
        return True


# Singleton instance
supabase_service = SupabaseService()
