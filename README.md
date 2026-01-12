# Chat Document

A full-stack chat application with document understanding capabilities powered by **Google Gemini 3 Pro Preview**. Upload images and PDFs to have intelligent conversations about your documents.

## Features

- Real-time chat with streaming responses via WebSocket
- Upload and discuss images (JPEG, PNG, GIF, WebP) and PDFs
- Multiple conversation threads with full history
- Document OCR and understanding via Gemini's multimodal capabilities
- Conversation memory within threads
- Modern, responsive UI with dark mode support
- **Local Supabase** for easy development

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **Bun** as package manager and runtime
- **shadcn/ui** + Tailwind CSS for UI components
- **TypeScript** for type safety

### Backend
- **FastAPI** for REST API and WebSocket
- **UV** for Python dependency management
- **LangChain** for LLM orchestration
- **Google Gemini 3 Pro Preview** for multimodal AI

### Storage
- **Supabase Local** (PostgreSQL + Storage via Docker)

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Supabase local)
- [Bun](https://bun.sh/) (v1.0+)
- [UV](https://docs.astral.sh/uv/) (Python package manager)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- [Google AI Studio](https://aistudio.google.com/) API key

## Quick Start

### 1. Run Setup

```bash
./scripts/setup.sh
```

This will:
- Check all prerequisites
- Install backend dependencies (Python)
- Install frontend dependencies (Node)
- Create the `.env` file

### 2. Add Your Google API Key

Edit `backend/.env` and add your API key:

```env
GOOGLE_API_KEY=your_api_key_here
```

Get your key from: https://aistudio.google.com/apikey

### 3. Start Docker Desktop

Make sure Docker Desktop is running (required for Supabase local).

### 4. Start Everything

```bash
./scripts/start.sh
```

This will:
- Start Supabase local (PostgreSQL, Storage, Studio)
- Run database migrations automatically
- Start the backend API (port 8000)
- Start the frontend (port 3000)

### 5. Open the App

- **App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Supabase Studio**: http://127.0.0.1:54323

### Stop Services

```bash
./scripts/stop.sh
```

## Project Structure

```
ChatDocument/
├── backend/
│   ├── main.py              # FastAPI app with WebSocket
│   ├── config.py            # Configuration settings
│   ├── models.py            # Pydantic models
│   ├── services/
│   │   ├── chat_service.py      # LangChain + Gemini integration
│   │   └── supabase_client.py   # Database and storage
│   ├── pyproject.toml       # Python dependencies
│   └── .env                 # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/
│   │   │   ├── chat/        # Chat components
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── hooks/           # React hooks (WebSocket)
│   │   ├── lib/             # Utilities and API client
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── supabase/
│   ├── config.toml          # Supabase configuration
│   └── migrations/          # Database migrations
│
├── scripts/
│   ├── setup.sh             # Install dependencies
│   ├── start.sh             # Start all services
│   └── stop.sh              # Stop all services
│
└── README.md
```

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations/{id}` | Get conversation details |
| PATCH | `/api/conversations/{id}` | Update conversation title |
| DELETE | `/api/conversations/{id}` | Delete conversation |
| GET | `/api/conversations/{id}/messages` | Get messages in conversation |
| POST | `/api/upload` | Upload file (image/PDF) |

### WebSocket

Connect to `ws://localhost:8000/ws/{client_id}`

**Send message:**
```json
{
  "type": "chat",
  "conversation_id": "uuid",
  "content": "message text",
  "attachments": []
}
```

**Receive events:**
- `stream_start` - AI response starting
- `stream_chunk` - Partial response text
- `stream_end` - Complete response
- `title_updated` - Conversation title auto-generated
- `error` - Error occurred

## Troubleshooting

**Docker not running:**
- Start Docker Desktop before running `./scripts/start.sh`

**Supabase won't start:**
- Ensure Docker has enough resources (4GB+ RAM recommended)
- Run `supabase stop` then `supabase start` to reset

**WebSocket connection fails:**
- Check that backend is running on port 8000
- View logs: `tail -f logs/backend.log`

**File upload fails:**
- Verify Supabase storage is running
- Check file size (max 25MB)
- Check logs for specific errors

**Gemini API errors:**
- Verify your API key is valid
- Check rate limits on your Google AI account
- Ensure you have access to `gemini-3-pro-preview`

## Production Deployment

For production, you'll want to:

1. Use Supabase Cloud instead of local:
   - Create a project at https://supabase.com
   - Update `backend/.env` with cloud credentials

2. Deploy backend to a cloud provider (Railway, Render, etc.)

3. Deploy frontend to Vercel:
   - Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`

## License

MIT
