import base64
import httpx
from typing import List, AsyncGenerator, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import settings
from models import Message, MessageRole, FileAttachment, FileType


class ChatService:
    _model: Optional[ChatGoogleGenerativeAI] = None

    system_prompt = """You are a helpful AI assistant with vision capabilities.
You can analyze images and PDF documents that users share with you.
When users share files, carefully examine them and provide detailed, helpful responses.
For PDFs, read and understand the content thoroughly.
For images, describe what you see and answer any questions about them.
Be conversational, helpful, and accurate in your responses."""

    @property
    def model(self) -> ChatGoogleGenerativeAI:
        """Lazy initialization of the Gemini model"""
        if self._model is None:
            if not settings.GOOGLE_API_KEY:
                raise ValueError(
                    "GOOGLE_API_KEY must be set in environment variables"
                )
            self._model = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.7,
                streaming=True,
            )
        return self._model

    def _convert_messages_to_langchain(
        self, messages: List[Message]
    ) -> List[HumanMessage | AIMessage]:
        """Convert our Message models to LangChain message format"""
        langchain_messages = []

        for msg in messages:
            if msg.role == MessageRole.USER:
                langchain_messages.append(HumanMessage(content=msg.content))
            else:
                langchain_messages.append(AIMessage(content=msg.content))

        return langchain_messages

    async def _prepare_multimodal_content(
        self, text: str, attachments: List[FileAttachment]
    ) -> List[dict]:
        """Prepare content with text and file attachments for Gemini"""
        content = []

        # Add text first
        if text:
            content.append({"type": "text", "text": text})

        # Process attachments
        for attachment in attachments:
            if attachment.type == FileType.IMAGE:
                # Fetch image and convert to base64
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(attachment.url)
                        image_data = base64.b64encode(response.content).decode("utf-8")

                    content.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{attachment.mime_type};base64,{image_data}"
                            },
                        }
                    )
                except Exception as e:
                    content.append(
                        {
                            "type": "text",
                            "text": f"[Failed to load image: {attachment.name}]",
                        }
                    )

            elif attachment.type == FileType.PDF:
                # For PDFs, we need to fetch and process them
                # Gemini 2.5 Pro supports direct PDF input
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(attachment.url)
                        pdf_data = base64.b64encode(response.content).decode("utf-8")

                    content.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:application/pdf;base64,{pdf_data}"
                            },
                        }
                    )
                except Exception as e:
                    content.append(
                        {
                            "type": "text",
                            "text": f"[Failed to load PDF: {attachment.name}]",
                        }
                    )

        return content

    async def generate_response_stream(
        self,
        conversation_messages: List[Message],
        new_message: str,
        attachments: List[FileAttachment] = [],
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from Gemini"""

        # Build message history
        messages = []

        # Add system message
        messages.append(SystemMessage(content=self.system_prompt))

        # Add conversation history (without the current message)
        for msg in conversation_messages:
            if msg.role == MessageRole.USER:
                # For historical messages, just use text content
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))

        # Add current message with attachments
        if attachments:
            multimodal_content = await self._prepare_multimodal_content(
                new_message, attachments
            )
            messages.append(HumanMessage(content=multimodal_content))
        else:
            messages.append(HumanMessage(content=new_message))

        # Stream response
        async for chunk in self.model.astream(messages):
            if chunk.content:
                # Handle various content types from LangChain Gemini
                content = chunk.content
                if isinstance(content, str):
                    yield content
                elif isinstance(content, list):
                    # Content might be a list of dicts with 'text' field or strings
                    for item in content:
                        if isinstance(item, str):
                            yield item
                        elif isinstance(item, dict) and "text" in item:
                            yield item["text"]
                        else:
                            yield str(item)
                elif isinstance(content, dict) and "text" in content:
                    yield content["text"]
                else:
                    yield str(content)

    async def generate_conversation_title(self, first_message: str) -> str:
        """Generate a short title for the conversation based on the first message"""
        prompt = f"""Generate a very short title (3-5 words max) for a conversation that starts with this message:
"{first_message}"

Respond with ONLY the title, no quotes or punctuation at the end."""

        # Use non-streaming for title generation
        non_streaming_model = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",  # Use lighter model for title generation
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
        )

        response = await non_streaming_model.ainvoke([HumanMessage(content=prompt)])
        # Handle various content types from LangChain Gemini
        content = response.content
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            # Extract text from list of items
            parts = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and "text" in item:
                    parts.append(item["text"])
            text = "".join(parts)
        elif isinstance(content, dict) and "text" in content:
            text = content["text"]
        else:
            text = str(content)
        return text.strip()[:50]  # Limit to 50 chars


# Singleton instance
chat_service = ChatService()
