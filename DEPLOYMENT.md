# Deployment Guide

This guide covers deploying Chat Document to production using:
- **Supabase Cloud** for database and file storage
- **Railway** for backend and frontend hosting

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- [Railway CLI](https://docs.railway.app/develop/cli) installed (optional, can use web UI)
- GitHub account
- Google AI API key from [AI Studio](https://aistudio.google.com/apikey)

## 1. Supabase Cloud Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project credentials:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public key
   - Service Role key (keep secret!)

### Deploy Database Schema

```bash
# Login to Supabase CLI
supabase login

# Link to your cloud project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to cloud
supabase db push

# Verify migrations applied
supabase db push --dry-run
```

### Configure Storage Bucket

The storage bucket `chat-files` is created automatically by the migration. Verify it exists in your Supabase dashboard under Storage.

## 2. Railway Deployment

### Option A: Deploy via GitHub (Recommended)

1. Push your code to GitHub (see section below)

2. Go to [railway.app](https://railway.app) and create a new project

3. **Deploy Backend:**
   - Click "New Service" → "GitHub Repo"
   - Select your repository
   - Set the root directory to `backend`
   - Add environment variables:
     ```
     GOOGLE_API_KEY=your_google_api_key
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_KEY=your_supabase_anon_key
     ```
   - Railway will auto-detect the Dockerfile and deploy

4. **Deploy Frontend:**
   - Click "New Service" → "GitHub Repo"
   - Select the same repository
   - Set the root directory to `frontend`
   - Add environment variables:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app
     NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
     ```
   - Railway will auto-detect the Dockerfile and deploy

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy backend
cd backend
railway up

# Deploy frontend (in a new service)
cd ../frontend
railway up
```

### Environment Variables Reference

**Backend (Railway):**
| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google AI Studio API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/public key |
| `PORT` | Auto-set by Railway |

**Frontend (Railway):**
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (https) |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL (wss) |

## 3. Push to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Chat Document application"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

## 4. Post-Deployment Checklist

- [ ] Verify Supabase migrations are applied (`supabase db push --dry-run`)
- [ ] Test backend health endpoint: `https://your-backend.railway.app/health`
- [ ] Test frontend loads: `https://your-frontend.railway.app`
- [ ] Test WebSocket connection (check browser console)
- [ ] Test file upload functionality
- [ ] Test chat with AI response

## Troubleshooting

### WebSocket Connection Issues
- Ensure `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`) for production
- Check Railway logs for connection errors

### File Upload Fails
- Verify Supabase storage bucket exists and has correct policies
- Check that `SUPABASE_KEY` has proper permissions

### Database Connection Issues
- Run `supabase db push` to ensure migrations are applied
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct

### Build Failures
- Check Docker build logs in Railway dashboard
- Ensure all dependencies are in `pyproject.toml` / `package.json`

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  Frontend       │────▶│  Backend        │
│  (Railway)      │ WS  │  (Railway)      │
│  Next.js        │     │  FastAPI        │
│                 │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │  Supabase       │
                        │  (Cloud)        │
                        │  - PostgreSQL   │
                        │  - Storage      │
                        │                 │
                        └─────────────────┘
```
